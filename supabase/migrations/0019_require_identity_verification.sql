-- 0019_require_identity_verification.sql
-- Identity verification is now REQUIRED to publish an item and to book one.
--
-- Everything here is server-side on purpose: the UI also hides/disables
-- the buttons (see VerifiedRoute / VerificationNotice), but a client can
-- be edited, so the real gate lives in RLS + the reservation RPCs.
--
-- Three enforcement points, because there are three ways to write:
--   1. items INSERT          → RLS policy (PublishItem posts directly).
--   2. reservations INSERT   → RLS policy (direct writes).
--   3. create_simulated_reservation / create_pending_reservation →
--      explicit check INSIDE the function. Both are SECURITY DEFINER,
--      so they run as the owner and RLS on reservations does NOT apply
--      to them — the policy alone would be trivially bypassable.
--
-- It also closes the hole that made all of the above pointless:
-- profiles_update_own let a user PATCH their own verification_status to
-- 'verified' straight from the client.

-- ────────────────────────────────────────────────────────────────────
-- 1. Storage bucket for identity documents
-- ────────────────────────────────────────────────────────────────────
-- Private (public=false): a DUI photo is national-ID data, same
-- reasoning as profile_private. Path convention {auth.uid()}/...,
-- authorized by the first path segment like item-photos does.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'identity-documents',
  'identity-documents',
  false,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "identity_documents_insert_own" on storage.objects;
create policy "identity_documents_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "identity_documents_select_own" on storage.objects;
create policy "identity_documents_select_own"
  on storage.objects for select
  using (
    bucket_id = 'identity-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No update/delete: a submitted document is evidence for the reviewer,
-- it should not be swappable after the fact.


-- ────────────────────────────────────────────────────────────────────
-- 2. is_identity_verified() — the single source of truth
-- ────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER so it reads profiles without depending on whatever
-- RLS context it is called from (policies, SECURITY DEFINER RPCs).
create or replace function public.is_identity_verified(p_user_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = coalesce(p_user_id, auth.uid())
      and verification_status = 'verified'
  );
$$;

grant execute on function public.is_identity_verified(uuid) to authenticated, anon;


-- ────────────────────────────────────────────────────────────────────
-- 3. Stop users from verifying themselves
-- ────────────────────────────────────────────────────────────────────
-- profiles_update_own (for update using (auth.uid() = id)) is row-level,
-- so it happily allows update profiles set verification_status='verified'
-- from the browser. Postgres RLS can't express "every column but this
-- one", so a BEFORE UPDATE trigger reverts the change instead.
--
-- The legitimate writers set lendrop.allow_verification_write for the
-- duration of their transaction; a reviewer using the service role is
-- allowed outright.
create or replace function public.protect_verification_status()
returns trigger
language plpgsql
as $$
begin
  if new.verification_status is distinct from old.verification_status
     and coalesce(current_setting('lendrop.allow_verification_write', true), 'off') <> 'on'
     and coalesce(auth.role(), '') <> 'service_role'
  then
    new.verification_status := old.verification_status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_verification_status on public.profiles;
create trigger protect_profiles_verification_status
  before update on public.profiles
  for each row execute function public.protect_verification_status();


-- ────────────────────────────────────────────────────────────────────
-- 4. Keep profiles.verification_status in sync with the submission
-- ────────────────────────────────────────────────────────────────────
-- Submitting documents moves the profile to 'pending' (a state the UI
-- shows differently from 'unverified'); a reviewer flipping the
-- identity_verifications row to verified/rejected propagates too, so
-- the reviewer never has to remember to touch two tables.
create or replace function public.sync_verification_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('lendrop.allow_verification_write', 'on', true);

  update public.profiles
  set verification_status = new.status
  where id = new.user_id;

  perform set_config('lendrop.allow_verification_write', 'off', true);
  return new;
end;
$$;

drop trigger if exists sync_profile_verification_status on public.identity_verifications;
create trigger sync_profile_verification_status
  after insert or update of status on public.identity_verifications
  for each row execute function public.sync_verification_status();


-- ────────────────────────────────────────────────────────────────────
-- 5. RLS: verified identity required to publish and to book
-- ────────────────────────────────────────────────────────────────────
drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own" on public.items
  for insert with check (
    owner_id = auth.uid()
    and public.is_identity_verified()
  );

drop policy if exists "reservations_insert_own" on public.reservations;
create policy "reservations_insert_own" on public.reservations
  for insert with check (
    renter_id = auth.uid()
    and public.is_identity_verified()
  );


-- ────────────────────────────────────────────────────────────────────
-- 6. Same check inside the reservation RPCs (they bypass RLS)
-- ────────────────────────────────────────────────────────────────────
-- 'IDENTITY_NOT_VERIFIED' is the contract the frontend matches on to
-- show the "verify your identity first" message instead of a generic
-- failure — keep the string if you edit these.
create or replace function public.create_simulated_reservation(
  p_item_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  reservation_id uuid,
  total_price numeric,
  protection_fee_amount numeric,
  commission_amount numeric,
  damage_liability_amount numeric,
  damage_liability_cap_applied numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  item_row record;
  breakdown record;
  new_reservation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not public.is_identity_verified(current_user_id) then
    raise exception 'IDENTITY_NOT_VERIFIED' using errcode = '42501';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;

  select i.price_per_day, i.declared_value, i.category_id, p.is_premium
  into item_row
  from public.items i
  join public.profiles p on p.id = i.owner_id
  where i.id = p_item_id and i.is_available;

  if item_row.price_per_day is null then
    raise exception 'Item is not available' using errcode = 'P0002';
  end if;

  select * into breakdown
  from public.calculate_pricing_breakdown(
    item_row.price_per_day,
    (p_end_date - p_start_date + 1),
    item_row.declared_value,
    item_row.category_id,
    item_row.is_premium
  );

  insert into public.reservations (
    item_id, renter_id, start_date, end_date, status, total_price,
    protection_fee_amount, commission_amount, damage_liability_amount, damage_liability_cap_applied
  )
  values (
    p_item_id, current_user_id, p_start_date, p_end_date, 'confirmed', breakdown.rental_subtotal,
    breakdown.protection_fee_amount, breakdown.commission_amount, breakdown.damage_liability_amount, breakdown.damage_liability_cap_applied
  )
  returning id into new_reservation_id;

  insert into public.payments (reservation_id, amount, status, provider, paid_at)
  values (new_reservation_id, breakdown.total_charged_today, 'paid', 'simulated', now());

  insert into public.damage_holds (reservation_id, amount_held, status, provider)
  values (new_reservation_id, breakdown.damage_liability_amount, 'held', 'simulated');

  reservation_id := new_reservation_id;
  total_price := breakdown.rental_subtotal;
  protection_fee_amount := breakdown.protection_fee_amount;
  commission_amount := breakdown.commission_amount;
  damage_liability_amount := breakdown.damage_liability_amount;
  damage_liability_cap_applied := breakdown.damage_liability_cap_applied;
  return next;
end;
$$;

revoke all on function public.create_simulated_reservation(uuid, date, date) from public;
grant execute on function public.create_simulated_reservation(uuid, date, date) to authenticated;


create or replace function public.create_pending_reservation(
  p_item_id uuid,
  p_start_date date,
  p_end_date date
)
returns table(reservation_id uuid, amount numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  item_price numeric;
  created_reservation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if not public.is_identity_verified(current_user_id) then
    raise exception 'IDENTITY_NOT_VERIFIED' using errcode = '42501';
  end if;

  if p_end_date < p_start_date then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;

  select price_per_day into item_price
  from public.items
  where id = p_item_id and is_available;

  if item_price is null then
    raise exception 'Item is not available' using errcode = 'P0002';
  end if;

  insert into public.reservations (item_id, renter_id, start_date, end_date, status, total_price)
  values (
    p_item_id,
    current_user_id,
    p_start_date,
    p_end_date,
    'pending',
    item_price * (p_end_date - p_start_date + 1)
  )
  returning id, total_price into created_reservation_id, amount;

  reservation_id := created_reservation_id;
  return next;
end;
$$;

revoke all on function public.create_pending_reservation(uuid, date, date) from public;
grant execute on function public.create_pending_reservation(uuid, date, date) to authenticated;


-- ────────────────────────────────────────────────────────────────────
-- 7. Grandfather the accounts that existed before this rule
-- ────────────────────────────────────────────────────────────────────
-- Every profile predating this migration is 'unverified' (nobody could
-- ever reach 'verified' — the verification screen was a mock). Without
-- this, turning the rule on would lock out every existing account,
-- demo data included. New signups still start 'unverified' and have to
-- go through /verification.
--
-- The cutoff is hardcoded to this migration's date so the file stays
-- safe to re-run: it can only ever touch accounts that predate the
-- rule, never someone who signed up afterwards. Rejected accounts are
-- untouched either way (the filter is 'unverified' only).
do $$
begin
  perform set_config('lendrop.allow_verification_write', 'on', true);

  update public.profiles
  set verification_status = 'verified'
  where verification_status = 'unverified'
    and created_at < timestamptz '2026-09-21 00:00:00+00';

  perform set_config('lendrop.allow_verification_write', 'off', true);
end
$$;


-- ────────────────────────────────────────────────────────────────────
-- HOW TO APPROVE OR REJECT A SUBMISSION
-- ────────────────────────────────────────────────────────────────────
-- There is no admin UI yet. Until there is, review runs from the SQL
-- Editor (which uses the service role, so the guard in section 3 lets
-- it through). Updating identity_verifications is enough — the trigger
-- in section 4 moves profiles.verification_status for you:
--
--   update public.identity_verifications
--   set status = 'verified',        -- or 'rejected'
--       reviewed_at = now(),
--       reviewer_notes = 'Looks good'
--   where user_id = '<uuid>'
--     and status = 'pending';
--
-- The documents are in the private identity-documents bucket, under
-- {user_id}/. Use Storage → identity-documents in the dashboard, or a
-- signed URL — they are not publicly readable.

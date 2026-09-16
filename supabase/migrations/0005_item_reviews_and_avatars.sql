-- 0005_item_reviews_and_avatars.sql
-- Fase 2: item-level comments/ratings + an avatars bucket for profile photos.
--
-- WHY A NEW "item_reviews" TABLE INSTEAD OF THE EXISTING "reviews" TABLE:
-- public.reviews is intentionally gated to a *completed reservation*
-- (see reviews_insert_participant policy in supabase_setup.sql) — that's
-- the real post-rental review flow planned for Fase 8. Reservations don't
-- exist yet (Fase 3+), so that table has no way to be written to today.
-- item_reviews is a lighter, item-scoped comment+star feature any logged
-- in user can leave right now. Both tables feed the same
-- profiles.average_rating / total_reviews aggregate on the lender, via
-- refresh_owner_rating() below — when Fase 8 ships, reservation reviews
-- and item reviews simply both count toward the same lender reputation.

create table public.item_reviews (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (item_id, reviewer_id)
);

create index item_reviews_item_idx on public.item_reviews(item_id);

alter table public.item_reviews enable row level security;

-- Reputation is public; anyone can read comments/ratings on a listing.
create policy "item_reviews_select_all" on public.item_reviews for select using (true);

-- Any authenticated user can review an item, but only as themselves,
-- and not their own listing (checked in the app; enforced here too).
create policy "item_reviews_insert_own" on public.item_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and not exists (
      select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()
    )
  );

create policy "item_reviews_update_own" on public.item_reviews
  for update using (reviewer_id = auth.uid());

create policy "item_reviews_delete_own" on public.item_reviews
  for delete using (reviewer_id = auth.uid());

-- Shared aggregate: recompute a lender's public rating from BOTH the
-- reservation-gated reviews table and the new item_reviews table.
create or replace function public.refresh_owner_rating(target_owner uuid)
returns void
language plpgsql
set search_path = public
as $$
begin
  update public.profiles
  set
    average_rating = coalesce((
      select round(avg(rating)::numeric, 2) from (
        select rating from public.reviews where reviewee_id = target_owner
        union all
        select ir.rating
        from public.item_reviews ir
        join public.items i on i.id = ir.item_id
        where i.owner_id = target_owner
      ) combined
    ), 0),
    total_reviews = (
      select count(*) from (
        select 1 from public.reviews where reviewee_id = target_owner
        union all
        select 1
        from public.item_reviews ir
        join public.items i on i.id = ir.item_id
        where i.owner_id = target_owner
      ) combined
    )
  where id = target_owner;
end;
$$;

-- Re-point the existing reviews trigger function at the shared aggregate
-- (CREATE OR REPLACE keeps the existing on_review_created trigger intact).
create or replace function public.update_profile_rating()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.refresh_owner_rating(new.reviewee_id);
  return new;
end;
$$;

create or replace function public.on_item_review_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_owner uuid;
begin
  select owner_id into target_owner
  from public.items
  where id = coalesce(new.item_id, old.item_id);

  if target_owner is not null then
    perform public.refresh_owner_rating(target_owner);
  end if;

  return coalesce(new, old);
end;
$$;

create trigger on_item_review_change
  after insert or update or delete on public.item_reviews
  for each row execute function public.on_item_review_change();


-- ── Avatars bucket ──────────────────────────────────────────────────
-- "profile-avatars" already exists on the live project (created by hand
-- in the dashboard, public, no size/mime limits set there); on_conflict
-- do nothing so this is also correct for a brand new project. Either
-- way, this brings its policies in line with the item-photos convention:
-- owner-only write, scoped by the {auth.uid()}/... folder, instead of the
-- pre-existing policies which let ANY authenticated user overwrite ANY
-- other user's avatar.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "Users can upload profile avatars 80b85y_0" on storage.objects;
drop policy if exists "Users can view profile avatars 80b85y_0" on storage.objects;
drop policy if exists "Users can update profile avatars 80b85y_1" on storage.objects;
drop policy if exists "Users can update profile avatars 80b85y_0" on storage.objects;

create policy "profile_avatars_bucket_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_avatars_bucket_update_own"
  on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_avatars_bucket_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile_avatars_bucket_select_all"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

-- 0013_damage_deposit_model.sql
-- Replaces the "hold 100% of the item's value" assumption with two
-- separate concepts:
--   1. Protection fee (5% of rental subtotal, non-refundable, charged
--      to the renter alongside the rental subtotal) — funds Lendrop's
--      damage pool, never released.
--   2. Damage-liability hold (35% of the item's declared value, capped
--      per category) — a SIMULATED pre-authorization, not a real card
--      hold. Released automatically if the rental ends with no
--      incident; captured (up to its amount) if damage is confirmed.
--
-- WOMPI BLOCKER: real payment processing is mocked for the MVP (see
-- PLAN_MVP_70.md Fase 4 — reservations currently confirm immediately
-- via create_simulated_reservation() below, with no real charge).
-- damage_holds.provider/provider_reference are already shaped for a
-- real Wompi hold/capture/release call — when that's connected, only
-- the three call sites that write to damage_holds need to actually
-- call Wompi; the schema and business rules here don't change.
--
-- SCOPE NOTE: this migration ships the data model and the
-- release/capture RPCs, not a damage-report UI. photo_evidence and
-- disputes already exist in the schema but have no screens built yet
-- (Fase 6 of PLAN_MVP_70.md) — capture_damage_hold() below is
-- self-report by the lender until a real dispute-review flow exists.
-- That is a known gap: a dishonest lender could currently self-report
-- damage to dodge Lendrop's commission and capture the renter's hold.
-- Gate this behind real review before exposing it in product UI.
--
-- KNOWN FOLLOW-UP: src/pages/earningdashboard.jsx computes lender
-- payout client-side from payments.amount and does not yet account for
-- reservations.commission_waived or damage_holds.captured_amount —
-- update it when the payout ledger is built for real.

alter table public.items rename column deposit_amount to declared_value;
comment on column public.items.declared_value is 'Replacement value declared by the lender at publish time. Base for the damage-liability hold (35%, capped per category).';

alter table public.categories add column damage_liability_cap numeric(10, 2) null check (damage_liability_cap is null or damage_liability_cap > 0);
comment on column public.categories.damage_liability_cap is 'Max USD damage-liability hold for items in this category. NULL = no cap (35% of declared_value applies uncapped).';

update public.categories set damage_liability_cap = 500 where slug in ('cameras', 'drones', 'electronics');

alter table public.reservations
  add column protection_fee_amount numeric(10, 2) not null default 0 check (protection_fee_amount >= 0),
  add column commission_amount numeric(10, 2) not null default 0 check (commission_amount >= 0),
  add column commission_waived boolean not null default false,
  add column damage_liability_amount numeric(10, 2) not null default 0 check (damage_liability_amount >= 0),
  add column damage_liability_cap_applied numeric(10, 2) null;

comment on column public.reservations.protection_fee_amount is 'Non-refundable protection fee (5% of total_price), charged to the renter. Snapshotted at confirmation — not recalculated if the item price changes later.';
comment on column public.reservations.commission_amount is 'Lendrop commission on this reservation, snapshotted at confirmation. Zeroed out via commission_waived if damage is confirmed.';
comment on column public.reservations.damage_liability_amount is 'Simulated pre-authorization for damage liability — 35% of declared_value, capped per category. Informational until a hold is captured.';

create table public.damage_holds (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  amount_held numeric(10, 2) not null check (amount_held >= 0),
  status text not null default 'held' check (status in ('held', 'released', 'captured', 'partially_captured', 'cancelled')),
  captured_amount numeric(10, 2) not null default 0 check (captured_amount >= 0),
  provider text not null default 'simulated',
  provider_reference text,
  dispute_id uuid references public.disputes(id),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  captured_at timestamptz
);

comment on table public.damage_holds is 'Simulated damage-liability hold, one per reservation. provider/provider_reference are ready for a real Wompi hold once the Wompi blocker is resolved.';

create index damage_holds_reservation_idx on public.damage_holds(reservation_id);

alter table public.damage_holds enable row level security;

create policy "damage_holds_select_involved" on public.damage_holds
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- Single source of truth for the pricing breakdown — called by RPC
-- from the frontend (live preview before booking) and from
-- create_simulated_reservation() below (authoritative, server-side).
-- No client input is trusted here except item_id/dates; price,
-- declared_value and the category cap are all read server-side.
create or replace function public.calculate_pricing_breakdown(
  p_price_per_day numeric,
  p_days integer,
  p_declared_value numeric,
  p_category_id uuid,
  p_is_premium boolean default false
)
returns table (
  rental_subtotal numeric,
  commission_rate numeric,
  commission_amount numeric,
  protection_fee_amount numeric,
  damage_liability_amount numeric,
  damage_liability_cap_applied numeric,
  total_charged_today numeric
)
language plpgsql
stable
set search_path = public
as $$
declare
  v_subtotal numeric;
  v_rate numeric;
  v_cap numeric;
  v_liability numeric;
begin
  if p_price_per_day is null or p_price_per_day <= 0 then
    raise exception 'price_per_day must be positive' using errcode = '22023';
  end if;
  if p_days is null or p_days <= 0 then
    raise exception 'days must be positive' using errcode = '22023';
  end if;

  v_subtotal := round(p_price_per_day * p_days, 2);

  -- Same tiers as src/lib/fees.js — keep both in sync if this changes.
  -- Premium lenders keep paying 0% commission, same as calculatePlatformFee.
  v_rate := case
    when p_is_premium then 0
    when v_subtotal <= 100 then 0.05
    when v_subtotal <= 300 then 0.10
    else 0.15
  end;

  select c.damage_liability_cap into v_cap from public.categories c where c.id = p_category_id;

  v_liability := round(coalesce(p_declared_value, 0) * 0.35, 2);
  if v_cap is not null and v_liability > v_cap then
    damage_liability_cap_applied := v_cap;
    v_liability := v_cap;
  else
    damage_liability_cap_applied := null;
  end if;

  rental_subtotal := v_subtotal;
  commission_rate := v_rate;
  commission_amount := round(v_subtotal * v_rate, 2);
  protection_fee_amount := round(v_subtotal * 0.05, 2);
  damage_liability_amount := v_liability;
  total_charged_today := rental_subtotal + protection_fee_amount;

  return next;
end;
$$;

revoke all on function public.calculate_pricing_breakdown(numeric, integer, numeric, uuid, boolean) from public;
grant execute on function public.calculate_pricing_breakdown(numeric, integer, numeric, uuid, boolean) to authenticated, anon;

-- Authoritative reservation creation for the simulated (no real Wompi
-- charge yet) flow. Mirrors create_pending_reservation's
-- security-definer pattern, but confirms immediately and also writes
-- the pricing snapshot, a matching payments row, and the damage hold —
-- atomically, so the client can never submit its own price or hold
-- amount.
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

-- Releases a held damage-liability hold with no capture — the "rental
-- ended with no incident" path. Whoever calls this (renter or owner)
-- must be party to the reservation. There is no automatic trigger for
-- this yet since nothing in the app transitions a reservation to
-- 'completed' today (Fase 5/6 return-leg not built) — call it manually
-- until that flow exists.
create or replace function public.release_damage_hold(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if not exists (
    select 1 from public.reservations r
    join public.items i on i.id = r.item_id
    where r.id = p_reservation_id and (r.renter_id = current_user_id or i.owner_id = current_user_id)
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  update public.damage_holds
  set status = 'released', released_at = now()
  where reservation_id = p_reservation_id and status = 'held';
end;
$$;

revoke all on function public.release_damage_hold(uuid) from public;
grant execute on function public.release_damage_hold(uuid) to authenticated;

-- Captures up to the held amount for a confirmed damage report and
-- waives Lendrop's commission on that reservation. Self-report by the
-- lender for now — see the scope note at the top of this file.
create or replace function public.capture_damage_hold(
  p_reservation_id uuid,
  p_repair_cost numeric,
  p_dispute_id uuid default null
)
returns table (captured_amount numeric, hold_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  hold_row record;
  v_capture numeric;
  v_status text;
begin
  if p_repair_cost is null or p_repair_cost <= 0 then
    raise exception 'repair cost must be positive' using errcode = '22023';
  end if;

  select dh.id, dh.amount_held, dh.status, i.owner_id
  into hold_row
  from public.damage_holds dh
  join public.reservations r on r.id = dh.reservation_id
  join public.items i on i.id = r.item_id
  where dh.reservation_id = p_reservation_id
  for update of dh;

  if hold_row.id is null then
    raise exception 'No hold found for this reservation' using errcode = 'P0002';
  end if;
  if hold_row.owner_id <> current_user_id then
    raise exception 'Only the lender can report damage' using errcode = '42501';
  end if;
  if hold_row.status <> 'held' then
    raise exception 'This hold is not capturable (status: %)', hold_row.status using errcode = '22023';
  end if;

  v_capture := least(p_repair_cost, hold_row.amount_held);
  v_status := case when p_repair_cost >= hold_row.amount_held then 'captured' else 'partially_captured' end;

  update public.damage_holds
  set status = v_status, captured_amount = v_capture, captured_at = now(), dispute_id = p_dispute_id
  where id = hold_row.id;

  update public.reservations
  set commission_waived = true
  where id = p_reservation_id;

  captured_amount := v_capture;
  hold_status := v_status;
  return next;
end;
$$;

revoke all on function public.capture_damage_hold(uuid, numeric, uuid) from public;
grant execute on function public.capture_damage_hold(uuid, numeric, uuid) to authenticated;

-- 0009_rental_flow_pricing.sql
-- Fase 2: booking calendar on item detail, platform transaction fee
-- transparency, and a truthful "currently rented" status.
--
-- ── WHY original_price_per_day IS FROZEN AT INSERT ───────────────────
-- The listing price the item was posted at is future training data for
-- an AI price-suggestion feature (see CLAUDE.md's "known gap" pattern of
-- keeping single sources of truth). If a lender edits price_per_day
-- later, original_price_per_day must stay put — otherwise there's no
-- historical price to learn from. Enforced with a trigger rather than
-- trusting the client to leave it alone.
--
-- ── WHY get_item_booked_ranges / get_currently_rented_item_ids EXIST ──
-- public.reservations only has "reservations_select_involved" (the
-- renter or the item owner) — nobody else can query it directly. But
-- any visitor needs to see which dates are already booked before
-- requesting a rental, and Explore needs to badge "Currently rented"
-- truthfully instead of trusting a manually-set flag the lender could
-- leave stale ("so they cannot lie us"). These two SECURITY DEFINER
-- functions expose only date ranges / item ids — never renter identity,
-- price, or anything else from the reservation row.
-- ════════════════════════════════════════════════════════════════════

-- 1. Freeze the listing price at posting time.
alter table public.items
  add column original_price_per_day numeric(10, 2);

update public.items
set original_price_per_day = price_per_day
where original_price_per_day is null;

alter table public.items
  alter column original_price_per_day set not null,
  add constraint items_original_price_per_day_check check (original_price_per_day > 0);

create or replace function public.freeze_item_original_price()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.original_price_per_day is null then
      new.original_price_per_day := new.price_per_day;
    end if;
  else
    new.original_price_per_day := old.original_price_per_day;
  end if;
  return new;
end;
$$;

create trigger freeze_item_original_price
  before insert or update on public.items
  for each row execute function public.freeze_item_original_price();

-- 2. Premium flag: waives Lendrop's transaction fee entirely (see
-- src/lib/fees.js). No billing flow exists yet (Premium page is still
-- "coming soon") — this just gives the fee calculation something real
-- to check once that ships.
alter table public.profiles
  add column is_premium boolean not null default false;

-- 3. Public-safe availability lookups.
create or replace function public.get_item_booked_ranges(p_item_id uuid)
returns table(start_date date, end_date date, status reservation_status)
language sql
stable
security definer
set search_path = public
as $$
  select r.start_date, r.end_date, r.status
  from public.reservations r
  where r.item_id = p_item_id
    and r.status in ('pending', 'confirmed', 'active')
$$;

grant execute on function public.get_item_booked_ranges(uuid) to authenticated, anon;

create or replace function public.get_currently_rented_item_ids()
returns table(item_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select distinct r.item_id
  from public.reservations r
  where r.status in ('confirmed', 'active')
    and current_date between r.start_date and r.end_date
$$;

grant execute on function public.get_currently_rented_item_ids() to authenticated, anon;

-- ════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN 0009
-- ════════════════════════════════════════════════════════════════════

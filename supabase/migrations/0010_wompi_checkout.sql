-- 0010_wompi_checkout.sql
-- Creates a pending reservation with the server-side price before checkout.

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
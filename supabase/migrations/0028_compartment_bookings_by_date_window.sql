-- 0028_compartment_bookings_by_date_window.sql
-- Documents a migration already applied directly to the Supabase project
-- (name: compartment_bookings_by_date_window, version 20260922001338).
-- Pulled verbatim from supabase_migrations.schema_migrations.

-- =====================================================================
-- Reserva de compartimentos por VENTANA DE FECHAS
-- Antes: un compartimento quedaba 'reserved' desde la confirmación hasta
-- la devolución, aunque el alquiler fuera en 30 días -> capacidad falsa.
-- Ahora:
--   * compartment_bookings = planificación (quién usa qué compartimento y cuándo)
--   * locker_compartments.status = estado FÍSICO (available/occupied/maintenance)
-- Ventana = [inicio - 1 día (el dueño deposita), fin + 1 día (margen de devolución)]
-- =====================================================================

create table if not exists public.compartment_bookings (
  id uuid primary key default gen_random_uuid(),
  compartment_id uuid not null references public.locker_compartments(id) on delete restrict,
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  window_dates daterange not null,
  status text not null default 'active' check (status in ('active', 'released')),
  created_at timestamptz not null default now(),
  released_at timestamptz,
  constraint compartment_bookings_no_overlap
    exclude using gist (compartment_id with =, window_dates with &&) where (status = 'active')
);
comment on table public.compartment_bookings is
  'Planificación de uso de compartimentos por fechas. La restricción de exclusión garantiza que un compartimento nunca tenga dos reservas activas traslapadas.';
create index if not exists compartment_bookings_compartment_idx on public.compartment_bookings (compartment_id) where status = 'active';

alter table public.compartment_bookings enable row level security;
drop policy if exists compartment_bookings_select_involved on public.compartment_bookings;
create policy compartment_bookings_select_involved on public.compartment_bookings
  for select to authenticated using (
    exists (select 1 from public.reservations r join public.items i on i.id = r.item_id
            where r.id = compartment_bookings.reservation_id
              and (r.renter_id = auth.uid() or i.owner_id = auth.uid()))
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Ventana de uso de una reserva
create or replace function public.compartment_window(p_start date, p_end date)
returns daterange
language sql
immutable
set search_path = public
as $$
  select daterange(p_start - 1, p_end + 1, '[]');
$$;

-- Compartimento libre más pequeño donde cabe, para una ventana dada
create or replace function public.find_free_compartment(
  p_required_size text, p_city text, p_window daterange)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.id
  from public.locker_compartments c
  join public.lockers l on l.id = c.locker_id and l.is_active
  join public.locker_size_classes s on s.code = c.size and s.is_active
  join public.locker_size_classes req on req.code = p_required_size
  where s.rank >= req.rank
    and c.status <> 'maintenance'
    -- si la ventana empieza ya, el compartimento tiene que estar físicamente vacío
    and not (c.status = 'occupied' and lower(p_window) <= current_date + 1)
    and not exists (
      select 1 from public.compartment_bookings b
      where b.compartment_id = c.id and b.status = 'active' and b.window_dates && p_window)
  order by (l.city = p_city) desc, s.rank asc, random()
  limit 1;
$$;
revoke execute on function public.find_free_compartment(text, text, daterange) from public, anon, authenticated;

-- Asigna compartimento a UNA reserva (reutilizable: trigger, reintentos, backfill)
create or replace function public.assign_compartment_for_reservation(p_reservation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res record;
  v_window daterange;
  v_comp uuid;
  v_attempt int := 0;
begin
  select r.id, r.status, r.compartment_id, r.start_date, r.end_date, i.required_locker_size, i.location_city
    into v_res
  from public.reservations r join public.items i on i.id = r.item_id
  where r.id = p_reservation_id
  for update of r;

  if v_res.id is null or v_res.status not in ('confirmed', 'active') then
    return null;
  end if;
  if v_res.compartment_id is not null then
    return v_res.compartment_id;
  end if;
  if v_res.required_locker_size is null then
    return null;
  end if;

  v_window := public.compartment_window(v_res.start_date, v_res.end_date);

  -- Reintento ante carrera: si otra transacción tomó el mismo compartimento,
  -- la exclusión lo rechaza y probamos con el siguiente.
  loop
    v_attempt := v_attempt + 1;
    v_comp := public.find_free_compartment(v_res.required_locker_size, v_res.location_city, v_window);
    exit when v_comp is null;
    begin
      insert into public.compartment_bookings (compartment_id, reservation_id, window_dates)
      values (v_comp, v_res.id, v_window);
      update public.reservations set compartment_id = v_comp where id = v_res.id;
      return v_comp;
    exception when exclusion_violation then
      exit when v_attempt >= 5;
    end;
  end loop;
  return null;
end;
$$;
revoke execute on function public.assign_compartment_for_reservation(uuid) from public, anon, authenticated;

-- Trigger de confirmación ahora delega en la función reutilizable
create or replace function public.assign_compartment_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and new.compartment_id is null then
    perform public.assign_compartment_for_reservation(new.id);
  end if;
  return new;
end;
$$;
revoke execute on function public.assign_compartment_on_confirm() from public, anon, authenticated;

-- Liberar reserva de compartimento al cancelar / completar / disputar
create or replace function public.release_compartment_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('cancelled', 'completed', 'disputed') and old.status is distinct from new.status then
    update public.compartment_bookings
      set status = 'released', released_at = now()
    where reservation_id = new.id and status = 'active';
  end if;
  return new;
end;
$$;
revoke execute on function public.release_compartment_on_cancel() from public, anon, authenticated;

-- Al borrar la reserva, el booking se borra por cascade; ya no se toca el estado físico
create or replace function public.release_compartment_on_reservation_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return old;
end;
$$;
revoke execute on function public.release_compartment_on_reservation_delete() from public, anon, authenticated;

-- Capacidad por FECHAS (reemplaza la versión sin fechas)
drop function if exists public.has_locker_capacity_for_item(uuid);
create or replace function public.has_locker_capacity_for_item(p_item_id uuid, p_start date, p_end date)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.find_free_compartment(i.required_locker_size, i.location_city,
                                      public.compartment_window(p_start, p_end)) is not null
  from public.items i
  where i.id = p_item_id and i.required_locker_size is not null;
$$;
revoke execute on function public.has_locker_capacity_for_item(uuid, date, date) from public, anon;
grant  execute on function public.has_locker_capacity_for_item(uuid, date, date) to authenticated;

-- create_checkout usa la capacidad por fechas
create or replace function public.create_checkout(p_item_id uuid, p_start_date date, p_end_date date)
returns table (
  reservation_id uuid, payment_id uuid, amount numeric, currency text,
  rental_subtotal numeric, commission_amount numeric, protection_fee_amount numeric,
  damage_liability_amount numeric, expires_at timestamptz, environment text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item record;
  v_bd record;
  v_res_id uuid;
  v_pay_id uuid;
  v_expires timestamptz := now() + interval '15 minutes';
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.is_identity_verified(v_uid) then
    raise exception 'IDENTITY_NOT_VERIFIED' using errcode = '42501';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'INVALID_DATE_RANGE' using errcode = '22023';
  end if;
  if p_start_date < current_date then
    raise exception 'START_DATE_IN_PAST' using errcode = '22023';
  end if;

  select i.owner_id, i.price_per_day, i.declared_value, i.category_id, i.required_locker_size, p.is_premium
    into v_item
  from public.items i
  join public.profiles p on p.id = i.owner_id
  where i.id = p_item_id and i.is_available;

  if v_item.price_per_day is null then
    raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0002';
  end if;
  if v_item.owner_id = v_uid then
    raise exception 'CANNOT_RENT_OWN_ITEM' using errcode = '22023';
  end if;
  if v_item.required_locker_size is null then
    raise exception 'ITEM_TOO_LARGE_FOR_LOCKERS' using errcode = '22023';
  end if;

  select r.id, pay.id into v_res_id, v_pay_id
  from public.reservations r
  join public.payments pay on pay.reservation_id = r.id
  where r.item_id = p_item_id and r.renter_id = v_uid
    and r.start_date = p_start_date and r.end_date = p_end_date
    and r.status = 'pending' and pay.status = 'pending'
    and pay.checkout_expires_at > now()
  limit 1;

  if v_res_id is null and not coalesce(public.has_locker_capacity_for_item(p_item_id, p_start_date, p_end_date), false) then
    raise exception 'NO_LOCKER_CAPACITY' using errcode = 'P0002',
      hint = 'No hay compartimentos del tamaño necesario libres para esas fechas.';
  end if;

  select * into v_bd from public.calculate_pricing_breakdown(
    v_item.price_per_day, (p_end_date - p_start_date + 1),
    v_item.declared_value, v_item.category_id, v_item.is_premium);

  if v_res_id is null then
    begin
      insert into public.reservations (
        item_id, renter_id, start_date, end_date, status, total_price,
        protection_fee_amount, commission_amount, damage_liability_amount, damage_liability_cap_applied)
      values (
        p_item_id, v_uid, p_start_date, p_end_date, 'pending', v_bd.rental_subtotal,
        v_bd.protection_fee_amount, v_bd.commission_amount, v_bd.damage_liability_amount, v_bd.damage_liability_cap_applied)
      returning id into v_res_id;
    exception when exclusion_violation then
      raise exception 'DATES_UNAVAILABLE' using errcode = '23P01';
    end;

    insert into public.payments (reservation_id, amount, status, provider, environment, checkout_expires_at)
    values (v_res_id, v_bd.total_charged_today, 'pending', 'wompi', 'mock', v_expires)
    returning id into v_pay_id;
  else
    select pay.checkout_expires_at into v_expires from public.payments pay where pay.id = v_pay_id;
  end if;

  reservation_id := v_res_id;
  payment_id := v_pay_id;
  amount := v_bd.total_charged_today;
  currency := 'USD';
  rental_subtotal := v_bd.rental_subtotal;
  commission_amount := v_bd.commission_amount;
  protection_fee_amount := v_bd.protection_fee_amount;
  damage_liability_amount := v_bd.damage_liability_amount;
  expires_at := v_expires;
  environment := 'mock';
  return next;
end;
$$;
revoke execute on function public.create_checkout(uuid, date, date) from public, anon;
grant  execute on function public.create_checkout(uuid, date, date) to authenticated;

-- Reintento automático: reservas confirmadas que quedaron sin locker
create or replace function public.retry_unassigned_compartments()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count int := 0;
begin
  for v_row in
    select id from public.reservations
    where status in ('confirmed', 'active') and compartment_id is null and end_date >= current_date
    order by start_date
  loop
    if public.assign_compartment_for_reservation(v_row.id) is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.retry_unassigned_compartments() from public, anon, authenticated;
grant  execute on function public.retry_unassigned_compartments() to service_role;

select cron.unschedule('reintentar-lockers') where exists (select 1 from cron.job where jobname = 'reintentar-lockers');
select cron.schedule('reintentar-lockers', '*/15 * * * *', 'select public.retry_unassigned_compartments();');

-- ---------------------------------------------------------------------
-- Backfill
-- 1) Reservas vigentes que ya tenían compartimento -> booking por fechas
insert into public.compartment_bookings (compartment_id, reservation_id, window_dates)
select r.compartment_id, r.id, public.compartment_window(r.start_date, r.end_date)
from public.reservations r
where r.compartment_id is not null and r.status in ('pending', 'confirmed', 'active')
on conflict (reservation_id) do nothing;

-- 2) 'reserved' ya no es un estado físico: nada se ha depositado (locker_events vacío)
update public.locker_compartments c set status = 'available'
where c.status = 'reserved'
  and not exists (select 1 from public.locker_events e where e.compartment_id = c.id);

-- 3) Reservas confirmadas sin locker: asignar ahora
select public.retry_unassigned_compartments();

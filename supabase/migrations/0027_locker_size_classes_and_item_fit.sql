-- 0027_locker_size_classes_and_item_fit.sql
-- Documents a migration already applied directly to the Supabase project
-- (name: locker_size_classes_and_item_fit, version 20260922001045).
-- Pulled verbatim from supabase_migrations.schema_migrations.

-- =====================================================================
-- Tamaños de locker + encaje artículo/compartimento
-- - Tamaños como DATOS (tabla), no hardcodeados: cambiar de fabricante o
--   de país = editar filas.
-- - Encaje con rotación: se ordenan las 3 medidas de ambos y se comparan.
-- - Asignación de locker: el compartimento libre MÁS PEQUEÑO donde cabe.
-- =====================================================================

-- 1) Catálogo de tamaños (medidas internas en cm)
create table if not exists public.locker_size_classes (
  code text primary key,                       -- mismo valor que locker_compartments.size
  label text not null,                         -- lo que ve el usuario: S, M, L, XL
  rank smallint not null unique,               -- orden de menor a mayor
  inner_height_cm numeric(6,1) not null check (inner_height_cm > 0),
  inner_width_cm  numeric(6,1) not null check (inner_width_cm > 0),
  inner_depth_cm  numeric(6,1) not null check (inner_depth_cm > 0),
  max_weight_kg   numeric(6,1) not null check (max_weight_kg > 0),
  is_active boolean not null default true
);
comment on table public.locker_size_classes is
  'Tamaños de compartimento (medidas internas). Ajustar a las del fabricante real cuando se elija hardware.';

insert into public.locker_size_classes (code, label, rank, inner_height_cm, inner_width_cm, inner_depth_cm, max_weight_kg) values
  ('small',  'S',  1,  12,  42, 60, 10),
  ('medium', 'M',  2,  30,  42, 60, 20),
  ('large',  'L',  3,  60,  42, 60, 30),
  ('xlarge', 'XL', 4, 190, 110, 60, 40)
on conflict (code) do nothing;

alter table public.locker_size_classes enable row level security;
drop policy if exists locker_size_classes_select_all on public.locker_size_classes;
create policy locker_size_classes_select_all on public.locker_size_classes
  for select to anon, authenticated using (true);

-- 2) Compartimentos: tamaño referencia al catálogo (acepta 'xlarge')
alter table public.locker_compartments drop constraint if exists locker_compartments_size_check;
alter table public.locker_compartments drop constraint if exists locker_compartments_size_fkey;
alter table public.locker_compartments
  add constraint locker_compartments_size_fkey foreign key (size) references public.locker_size_classes(code);

-- 3) Categorías: tamaño estimado por defecto
alter table public.categories
  add column if not exists default_locker_size text references public.locker_size_classes(code);

update public.categories set default_locker_size = case trim(name)
  when 'Cameras'             then 'small'
  when 'Electronics'         then 'small'
  when 'Clothing'            then 'medium'
  when 'Costumes'            then 'medium'
  when 'Drones'              then 'medium'
  when 'Tools'               then 'medium'
  when 'Sports Equipment'    then 'large'
  when 'Camping Equipment'   then 'large'
  when 'Suitcase'            then 'large'
  when 'Musical Instruments' then 'xlarge'
  when 'Bicycles'            then 'xlarge'
  else 'medium' end
where default_locker_size is null;

-- 4) Artículos: medidas del paquete (listo para entregar) y tamaño requerido
alter table public.items
  add column if not exists length_cm numeric(6,1) check (length_cm is null or (length_cm > 0 and length_cm <= 300)),
  add column if not exists width_cm  numeric(6,1) check (width_cm  is null or (width_cm  > 0 and width_cm  <= 300)),
  add column if not exists height_cm numeric(6,1) check (height_cm is null or (height_cm > 0 and height_cm <= 300)),
  add column if not exists weight_kg numeric(6,2) check (weight_kg is null or (weight_kg > 0 and weight_kg <= 200)),
  add column if not exists required_locker_size text references public.locker_size_classes(code),
  add column if not exists dimensions_source text not null default 'category_default'
    check (dimensions_source in ('owner', 'category_default'));

alter table public.items drop constraint if exists items_dimensions_all_or_none;
alter table public.items add constraint items_dimensions_all_or_none check (
  (length_cm is null and width_cm is null and height_cm is null)
  or (length_cm is not null and width_cm is not null and height_cm is not null)
);

comment on column public.items.required_locker_size is
  'Tamaño mínimo de compartimento donde cabe el artículo. Lo calcula el trigger; NULL = no cabe en ningún locker.';

-- 5) ¿Cabe? (con rotación)
create or replace function public.item_fits_size(
  p_l numeric, p_w numeric, p_h numeric, p_kg numeric, p_size text)
returns boolean
language sql
stable
set search_path = public
as $$
  with item as (
    select greatest(p_l, p_w, p_h) a1,
           p_l + p_w + p_h - greatest(p_l, p_w, p_h) - least(p_l, p_w, p_h) a2,
           least(p_l, p_w, p_h) a3
  ), box as (
    select greatest(inner_height_cm, inner_width_cm, inner_depth_cm) b1,
           inner_height_cm + inner_width_cm + inner_depth_cm
             - greatest(inner_height_cm, inner_width_cm, inner_depth_cm)
             - least(inner_height_cm, inner_width_cm, inner_depth_cm) b2,
           least(inner_height_cm, inner_width_cm, inner_depth_cm) b3,
           max_weight_kg
    from public.locker_size_classes where code = p_size and is_active
  )
  select coalesce((select a1 <= b1 and a2 <= b2 and a3 <= b3 and coalesce(p_kg, 0) <= max_weight_kg
                   from item, box), false);
$$;

-- Tamaño más pequeño donde cabe (NULL si no cabe en ninguno)
create or replace function public.compute_required_locker_size(
  p_l numeric, p_w numeric, p_h numeric, p_kg numeric)
returns text
language sql
stable
set search_path = public
as $$
  select code from public.locker_size_classes
  where is_active and public.item_fits_size(p_l, p_w, p_h, p_kg, code)
  order by rank
  limit 1;
$$;

grant execute on function public.item_fits_size(numeric, numeric, numeric, numeric, text) to anon, authenticated;
grant execute on function public.compute_required_locker_size(numeric, numeric, numeric, numeric) to anon, authenticated;

-- 6) Trigger: el tamaño requerido siempre lo calcula la BD (el cliente no lo decide)
create or replace function public.set_item_required_locker_size()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.length_cm is not null then
    new.required_locker_size := public.compute_required_locker_size(new.length_cm, new.width_cm, new.height_cm, new.weight_kg);
    new.dimensions_source := 'owner';
  else
    select c.default_locker_size into new.required_locker_size
    from public.categories c where c.id = new.category_id;
    new.dimensions_source := 'category_default';
  end if;
  return new;
end;
$$;
revoke execute on function public.set_item_required_locker_size() from public, anon, authenticated;

drop trigger if exists set_item_required_locker_size on public.items;
create trigger set_item_required_locker_size
  before insert or update of length_cm, width_cm, height_cm, weight_kg, category_id, required_locker_size, dimensions_source
  on public.items
  for each row execute function public.set_item_required_locker_size();

-- Backfill de los artículos existentes
update public.items i
set required_locker_size = c.default_locker_size, dimensions_source = 'category_default'
from public.categories c
where c.id = i.category_id and i.length_cm is null;

-- 7) Asignación de locker: compartimento libre más pequeño donde cabe,
--    priorizando la ciudad del artículo
create or replace function public.assign_compartment_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_id uuid;
  v_city text;
  v_required_rank smallint;
begin
  if new.status <> 'confirmed' or new.compartment_id is not null then
    return new;
  end if;

  select i.location_city, s.rank into v_city, v_required_rank
  from public.items i
  left join public.locker_size_classes s on s.code = i.required_locker_size
  where i.id = new.item_id;

  if v_required_rank is null then
    return new;  -- no cabe en ningún locker: create_checkout ya lo impide
  end if;

  select c.id into chosen_id
  from public.locker_compartments c
  join public.lockers l on l.id = c.locker_id
  join public.locker_size_classes s on s.code = c.size
  where c.status = 'available' and l.is_active and s.is_active
    and s.rank >= v_required_rank
  order by (l.city = v_city) desc, s.rank asc, random()
  limit 1
  for update of c skip locked;

  if chosen_id is not null then
    update public.locker_compartments set status = 'reserved' where id = chosen_id;
    update public.reservations set compartment_id = chosen_id where id = new.id;
  end if;

  return new;
end;
$$;
revoke execute on function public.assign_compartment_on_confirm() from public, anon, authenticated;

-- 8) Capacidad: ¿hay algún compartimento libre donde quepa este artículo?
create or replace function public.has_locker_capacity_for_item(p_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.items i
    join public.locker_size_classes req on req.code = i.required_locker_size
    join public.locker_compartments c on c.status = 'available'
    join public.lockers l on l.id = c.locker_id and l.is_active
    join public.locker_size_classes s on s.code = c.size and s.is_active
    where i.id = p_item_id and s.rank >= req.rank
  );
$$;
revoke execute on function public.has_locker_capacity_for_item(uuid) from public, anon;
grant  execute on function public.has_locker_capacity_for_item(uuid) to authenticated;

-- 9) create_checkout: bloquea artículos que no caben o sin capacidad
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

  -- Idempotencia: reutilizar checkout vigente
  select r.id, pay.id into v_res_id, v_pay_id
  from public.reservations r
  join public.payments pay on pay.reservation_id = r.id
  where r.item_id = p_item_id and r.renter_id = v_uid
    and r.start_date = p_start_date and r.end_date = p_end_date
    and r.status = 'pending' and pay.status = 'pending'
    and pay.checkout_expires_at > now()
  limit 1;

  if v_res_id is null and not public.has_locker_capacity_for_item(p_item_id) then
    raise exception 'NO_LOCKER_CAPACITY' using errcode = 'P0002',
      hint = 'No hay compartimentos libres del tamaño necesario en este momento.';
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

-- 10) Un compartimento XL por locker (lockers simulados)
insert into public.locker_compartments (locker_id, compartment_code, size, status)
select l.id, x.code, 'xlarge', 'available'
from public.lockers l
join (values
  ('Lendrop Locker — Metrocentro', 'A5'),
  ('Lendrop Locker — Multiplaza',  'B4'),
  ('Lendrop Locker — La Gran Vía', 'C4')
) as x(name, code) on x.name = l.name
on conflict (locker_id, compartment_code) do nothing;

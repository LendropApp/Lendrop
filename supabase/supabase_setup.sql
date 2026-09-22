-- ════════════════════════════════════════════════════════════════════
-- LENDROP — SCHEMA DE BASE DE DATOS (Supabase / PostgreSQL)
-- ════════════════════════════════════════════════════════════════════
-- CÓMO USAR ESTE ARCHIVO:
--   1. Entra a tu proyecto en supabase.com
--   2. Ve a "SQL Editor" (menú izquierdo)
--   3. Pega TODO este archivo y dale "Run"
--   4. Debe ejecutarse de una sola vez, de arriba a abajo — el orden
--      importa porque las tablas de abajo dependen de las de arriba.
--
-- Este archivo refleja el estado REAL del proyecto en producción a fecha
-- 2026-09-21 (reconciliado contra la base de datos en vivo, no una
-- réplica de cada migración histórica una por una). Las migraciones
-- individuales en supabase/migrations/ siguen siendo la fuente de verdad
-- de CÓMO se llegó aquí; este archivo es la foto de A DÓNDE se llegó,
-- para poder levantar un proyecto nuevo desde cero en una sola pasada.
--
-- GLOSARIO RÁPIDO (para el equipo sin experiencia en SQL):
--   - "uuid"        : un identificador único generado aleatoriamente,
--                      en vez de un número de auto-incremento (1,2,3...).
--                      Más seguro porque no se puede "adivinar" un id.
--   - "references"  : dice que una columna apunta al id de otra tabla
--                      (llave foránea / foreign key). Ej: item.owner_id
--                      apunta a profiles.id.
--   - "RLS"         : Row Level Security. Son reglas que Supabase aplica
--                      automáticamente para que un usuario SOLO pueda
--                      ver/editar los datos que le corresponden — sin
--                      que tengamos que validarlo a mano en cada
--                      pantalla del frontend.
--   - "trigger"     : código que la base de datos ejecuta sola cuando
--                      pasa algo (ej: al crear un usuario, crear su perfil).
--   - "security definer" : una función que corre con los permisos de
--                      quien la CREÓ, no de quien la LLAMA — necesario
--                      para que, p. ej., una reseña tuya pueda actualizar
--                      el rating de OTRA persona sin darte permiso
--                      general para editar perfiles ajenos.
-- ════════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONES
-- ────────────────────────────────────────────────────────────────────
-- pgcrypto  -> nos da gen_random_uuid() para generar los ids
-- btree_gist -> permite crear la restricción que evita reservas
--               duplicadas/traslapadas sobre el mismo artículo
create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";


-- ────────────────────────────────────────────────────────────────────
-- 2. TIPOS ENUMERADOS (listas cerradas de valores válidos)
-- ────────────────────────────────────────────────────────────────────
create type item_condition as enum ('new', 'like_new', 'good', 'fair');
create type reservation_status as enum ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed');
create type payment_status as enum ('pending', 'authorized', 'paid', 'refunded', 'failed');
create type dispute_status as enum ('open', 'under_review', 'resolved', 'rejected');
create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type compartment_status as enum ('available', 'reserved', 'occupied', 'maintenance');
create type notification_type as enum ('reservation', 'payment', 'message', 'review', 'dispute', 'system');


-- ────────────────────────────────────────────────────────────────────
-- 3. FUNCIÓN COMPARTIDA: auto-actualizar "updated_at"
-- ────────────────────────────────────────────────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 4. PROFILES  (información pública de cada usuario)
-- ────────────────────────────────────────────────────────────────────
-- No guardamos email/password aquí (eso vive en el esquema privado
-- auth.users que Supabase administra). Esta tabla es la versión
-- "pública" del usuario: nombre, foto, reputación, verificación.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  avatar_url text,
  phone text,
  bio text,
  city text not null default 'San Salvador',
  country text not null default 'SV',
  verification_status verification_status not null default 'unverified',
  average_rating numeric(3, 2) not null default 0 check (average_rating between 0 and 5),
  total_reviews integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_host boolean not null default false,
  host_activated_at timestamptz,
  is_premium boolean not null default false,
  is_admin boolean not null default false
);

comment on table public.profiles is 'Perfil público. Se crea automáticamente al registrarse (trigger on_auth_user_created).';

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Datos sensibles de identidad (DUI, fecha de nacimiento) y el
-- timestamp de aceptación de términos. Va en una tabla APARTE de
-- "profiles" a propósito: profiles es de lectura pública (para poder
-- mostrar "Publicado por Carlos" en un artículo), pero un número de
-- DUI es un dato de identidad nacional — nunca debe ser legible por
-- cualquiera. RLS de Postgres funciona por fila, no por columna, así
-- que la forma correcta de protegerlo es una tabla separada con su
-- propia policy restrictiva (ver sección 22, RLS).
create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  dui text unique,
  date_of_birth date,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.profile_private is 'Datos sensibles de identidad (DUI, fecha de nacimiento) y consentimiento de términos. NUNCA exponer esta tabla a lectura pública — solo el dueño (y más adelante, quien revise verificación de identidad) debe poder leerla.';

-- Trigger: cuando alguien se registra en auth.users, le creamos su
-- profile público Y su fila de datos privados de identidad.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario Lendrop'));

  insert into public.profile_private (user_id, dui, date_of_birth, terms_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'dui',
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date,
    case
      when (new.raw_user_meta_data ->> 'terms_accepted')::boolean is true then now()
      else null
    end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Guarda-raíl: nadie (ni el propio usuario) puede cambiar
-- verification_status directamente vía UPDATE en profiles. El único
-- camino legítimo es identity_verifications -> sync_verification_status()
-- (sección 16), que se auto-concede permiso momentáneo con
-- set_config('lendrop.allow_verification_write', 'on', true).
create function public.protect_verification_status()
returns trigger
language plpgsql
set search_path = public
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

create trigger protect_profiles_verification_status
  before update on public.profiles
  for each row execute function public.protect_verification_status();


-- ────────────────────────────────────────────────────────────────────
-- 5. CATEGORIES  (fuente única de verdad para la taxonomía)
-- ────────────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  icon text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  damage_liability_cap numeric(10, 2) null check (damage_liability_cap is null or damage_liability_cap > 0)
);

comment on column public.categories.damage_liability_cap is 'Max USD damage-liability hold for items in this category. NULL = no cap (35% of declared_value applies uncapped).';

insert into public.categories (name, slug, display_order) values
  ('Ropa', 'ropa', 1),
  ('Herramientas', 'herramientas', 2),
  ('Cámaras', 'camaras', 3),
  ('Drones', 'drones', 4),
  ('Instrumentos musicales', 'instrumentos-musicales', 5),
  ('Bicicletas', 'bicicletas', 6),
  ('Equipo deportivo', 'equipo-deportivo', 7),
  ('Electrónicos', 'electronicos', 8),
  ('Equipo de camping', 'equipo-camping', 9),
  ('Maletas', 'maletas', 10),
  ('Disfraces', 'disfraces', 11);

update public.categories set damage_liability_cap = 500 where slug in ('camaras', 'drones', 'electronicos');


-- ────────────────────────────────────────────────────────────────────
-- 6. ITEMS  (artículos publicados para alquiler)
-- ────────────────────────────────────────────────────────────────────
create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text not null,
  description text not null,
  condition item_condition not null default 'good',
  price_per_day numeric(10, 2) not null check (price_per_day > 0),
  -- declared_value: valor de reposición declarado por el lender al
  -- publicar. Antes se llamaba "deposit_amount"; renombrado cuando el
  -- modelo de depósito pasó a ser un damage-liability hold calculado
  -- (35% de este valor, con tope por categoría) en vez de un monto fijo.
  declared_value numeric(10, 2) not null default 0 check (declared_value >= 0),
  currency text not null default 'USD',
  is_available boolean not null default true,
  location_city text not null default 'San Salvador',
  original_price_per_day numeric(10, 2) check (original_price_per_day > 0),
  -- Columna generada automáticamente para búsqueda de texto en español.
  search_vector tsvector generated always as (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.items.declared_value is 'Replacement value declared by the lender at publish time. Base for the damage-liability hold (35%, capped per category).';

create trigger set_items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- original_price_per_day se congela en el primer precio publicado y
-- nunca cambia después — sirve para mostrar "antes $X, ahora $Y" si el
-- lender ajusta el precio más tarde, sin recalcular histórico.
create function public.freeze_item_original_price()
returns trigger
language plpgsql
set search_path = public
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


-- ────────────────────────────────────────────────────────────────────
-- 7. ITEM PHOTOS
-- ────────────────────────────────────────────────────────────────────
create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);


-- ────────────────────────────────────────────────────────────────────
-- 8. LOCKERS Y COMPARTIMIENTOS
-- ────────────────────────────────────────────────────────────────────
create table public.lockers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  address text not null,
  city text not null default 'San Salvador',
  latitude numeric,
  longitude numeric,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.locker_compartments (
  id uuid primary key default gen_random_uuid(),
  locker_id uuid not null references public.lockers(id) on delete cascade,
  compartment_code text not null,
  size text not null default 'medium' check (size in ('small', 'medium', 'large')),
  status compartment_status not null default 'available',
  created_at timestamptz not null default now()
);


-- ────────────────────────────────────────────────────────────────────
-- 9. RESERVATIONS
-- ────────────────────────────────────────────────────────────────────
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  renter_id uuid not null references public.profiles(id),
  compartment_id uuid references public.locker_compartments(id),
  start_date date not null,
  end_date date not null,
  status reservation_status not null default 'pending',
  total_price numeric(10, 2) not null check (total_price > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Modelo de precios (Fase 9/10): ver calculate_pricing_breakdown() más
  -- abajo. Todo se snapshotea al confirmar la reserva, no se recalcula
  -- después aunque cambie el precio del artículo.
  protection_fee_amount numeric(10, 2) not null default 0 check (protection_fee_amount >= 0),
  commission_amount numeric(10, 2) not null default 0 check (commission_amount >= 0),
  commission_waived boolean not null default false,
  damage_liability_amount numeric(10, 2) not null default 0 check (damage_liability_amount >= 0),
  damage_liability_cap_applied numeric(10, 2),
  exclude using gist (item_id with =, daterange(start_date, end_date, '[]') with &&)
    where (status in ('pending', 'confirmed', 'active'))
);

comment on column public.reservations.protection_fee_amount is 'Non-refundable protection fee (5% of total_price), charged to the renter. Snapshotted at confirmation.';
comment on column public.reservations.commission_amount is 'Lendrop commission on this reservation, snapshotted at confirmation. Zeroed out via commission_waived if damage is confirmed.';
comment on column public.reservations.damage_liability_amount is 'Simulated pre-authorization for damage liability -- 35% of declared_value, capped per category.';

create trigger set_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Asigna automáticamente un compartimiento libre (preferimos uno en la
-- misma ciudad del artículo) apenas la reserva pasa a 'confirmed'.
create function public.assign_compartment_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_id uuid;
  item_city text;
begin
  if new.status <> 'confirmed' or new.compartment_id is not null then
    return new;
  end if;

  select location_city into item_city from public.items where id = new.item_id;

  select c.id into chosen_id
  from public.locker_compartments c
  join public.lockers l on l.id = c.locker_id
  where c.status = 'available'
  order by (l.city = item_city) desc, random()
  limit 1
  for update of c skip locked;

  if chosen_id is not null then
    update public.locker_compartments set status = 'reserved' where id = chosen_id;
    update public.reservations set compartment_id = chosen_id where id = new.id;
  end if;

  return new;
end;
$$;

create trigger assign_compartment_after_confirm
  after insert or update on public.reservations
  for each row execute function public.assign_compartment_on_confirm();

create function public.release_compartment_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and new.compartment_id is not null then
    update public.locker_compartments
    set status = 'available'
    where id = new.compartment_id;
  end if;
  return new;
end;
$$;

create trigger release_compartment_after_cancel
  after update on public.reservations
  for each row execute function public.release_compartment_on_cancel();

create function public.release_compartment_on_reservation_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.compartment_id is not null then
    update public.locker_compartments
    set status = 'available'
    where id = old.compartment_id;
  end if;
  return old;
end;
$$;

create trigger release_compartment_after_delete
  after delete on public.reservations
  for each row execute function public.release_compartment_on_reservation_delete();

-- Guard de transiciones de reserva: el cliente SOLO puede cancelar una
-- reserva pending/confirmed (y solo si el artículo no entró al locker
-- todavía) — cualquier otro cambio de estado, monto, fecha o locker lo
-- hace el backend (service_role) vía las funciones de esta sección o
-- las de pagos (sección 11). Usa current_user (el rol EFECTIVO de
-- Postgres), no auth.role() (el claim del JWT) -- dentro de una función
-- SECURITY DEFINER de confianza (p. ej. apply_payment_result) el rol
-- efectivo cambia al del dueño de la función, así que ese código pasa
-- sin restricción; un UPDATE directo del cliente vía PostgREST sigue
-- corriendo como 'authenticated' y queda sujeto al guard.
create function public.guard_reservation_client_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'RESERVATION_FIELDS_READ_ONLY' using errcode = '42501',
      hint = 'Solo el backend puede modificar montos, fechas o locker.';
  end if;

  if new.status is distinct from old.status then
    if new.status <> 'cancelled' or old.status not in ('pending', 'confirmed') then
      raise exception 'INVALID_STATUS_TRANSITION' using errcode = '42501',
        hint = format('%s -> %s solo lo puede hacer el backend.', old.status, new.status);
    end if;
    if exists (select 1 from public.locker_events e where e.reservation_id = old.id) then
      raise exception 'CANNOT_CANCEL_AFTER_DROPOFF' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_reservation_client_update
  before update on public.reservations
  for each row execute function public.guard_reservation_client_update();


-- ────────────────────────────────────────────────────────────────────
-- 10. LOCKER EVENTS  (bitácora de aperturas/depósitos/retiros)
-- ────────────────────────────────────────────────────────────────────
-- En producción, estos eventos los debe insertar un backend seguro
-- (Edge Function locker-access) que valida DUI + contraseña — no el
-- cliente directamente. Ciclo completo: deposit (lender) -> pickup
-- (renter) -> return_dropoff (renter) -> return_pickup (lender), que
-- cierra la reserva como 'completed' (o 'disputed' si el lender reporta
-- daño, ver damage_holds en la sección 12).
create table public.locker_events (
  id uuid primary key default gen_random_uuid(),
  compartment_id uuid not null references public.locker_compartments(id),
  reservation_id uuid references public.reservations(id),
  actor_id uuid references public.profiles(id),
  event_type text not null check (
    event_type in ('opened', 'closed', 'item_deposited', 'item_retrieved', 'return_deposited', 'return_retrieved')
  ),
  occurred_at timestamptz not null default now()
);

comment on table public.locker_events is 'En producción, estos eventos los debe insertar un backend seguro (Edge Function) que valida el código físico del locker — no el cliente directamente.';


-- ────────────────────────────────────────────────────────────────────
-- 11. PRICING, RESERVAS Y PAGOS  (flujo real de checkout — Wompi mock)
-- ────────────────────────────────────────────────────────────────────
-- Contrato idéntico al que tendrá el sandbox/producción real:
--   create_checkout (cliente) -> pasarela -> apply_payment_result (webhook, backend)
-- Cambiar a Wompi real = nueva Edge Function de webhook que llama a
-- apply_payment_result; la base de datos no cambia.

-- Fuente única de verdad para el desglose de precio — la llama tanto el
-- RPC de preview en vivo como create_checkout (autoritativo). Ningún
-- input del cliente se confía salvo item_id/fechas: precio, valor
-- declarado y tope de categoría siempre se leen server-side.
create function public.calculate_pricing_breakdown(
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

  -- Mismos tramos que src/lib/fees.js — mantener sincronizados si cambia.
  -- Lenders premium siguen sin comisión (0%).
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

grant execute on function public.calculate_pricing_breakdown(numeric, integer, numeric, uuid, boolean) to authenticated, anon;

-- Reserva "confirmada al instante" (sin checkout de pago) -- usada
-- antes del flujo de Wompi mock. Se mantiene por compatibilidad; el
-- frontend actual usa create_checkout + payments-checkout en su lugar.
create function public.create_simulated_reservation(
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

grant execute on function public.create_simulated_reservation(uuid, date, date) to authenticated;

-- Variante más simple, sin desglose de fees -- de una etapa anterior del
-- proyecto. Se mantiene por compatibilidad.
create function public.create_pending_reservation(p_item_id uuid, p_start_date date, p_end_date date)
returns table (reservation_id uuid, amount numeric)
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

grant execute on function public.create_pending_reservation(uuid, date, date) to authenticated;

-- Pagos. Los cambios de estado deben venir del webhook (hoy, la Edge
-- Function payments-checkout llamando a apply_payment_result), nunca
-- escritos directamente por el cliente.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'USD',
  status payment_status not null default 'pending',
  provider text not null default 'wompi',
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  -- Columnas del flujo Wompi mock (checkout con expiración + marca/
  -- last4 de tarjeta, nunca el número completo ni el CVC).
  environment text not null default 'mock' check (environment in ('mock', 'sandbox', 'production')),
  checkout_expires_at timestamptz,
  failure_reason text,
  card_brand text,
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  updated_at timestamptz not null default now()
);

comment on table public.payments is 'Los cambios de estado de pago deben venir del webhook de Wompi vía Edge Function (service role), nunca escritos directamente por el cliente — por eso no tiene policies de insert/update para "authenticated".';

create unique index payments_provider_reference_uniq
  on public.payments (provider, provider_reference) where provider_reference is not null;
create index payments_pending_expiry_idx
  on public.payments (checkout_expires_at) where status = 'pending';

create trigger set_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- Bitácora inmutable de cada evento de la pasarela (auditoría +
-- idempotencia vía event_key). Hoy la escribe apply_payment_result;
-- mañana, el webhook real de Wompi apuntará al mismo punto de entrada.
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text not null,
  environment text not null,
  event_key text not null unique,
  outcome text not null check (outcome in ('approved', 'declined', 'error', 'expired')),
  provider_transaction_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

comment on table public.payment_events is 'Registro inmutable de cada evento de la pasarela (hoy mock, mañana webhook real de Wompi). Solo lo escribe el backend.';

create index payment_events_payment_idx on public.payment_events (payment_id);

-- Lo llama el cliente al pulsar "Pagar": crea (o reutiliza, si hay un
-- checkout vigente) la reserva 'pending' + el pago 'pending' con 15
-- minutos para completar el pago -- bloqueando esas fechas mientras
-- tanto vía el exclusion constraint de reservations.
create function public.create_checkout(p_item_id uuid, p_start_date date, p_end_date date)
returns table (
  reservation_id uuid,
  payment_id uuid,
  amount numeric,
  currency text,
  rental_subtotal numeric,
  commission_amount numeric,
  protection_fee_amount numeric,
  damage_liability_amount numeric,
  expires_at timestamptz,
  environment text
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

  select i.owner_id, i.price_per_day, i.declared_value, i.category_id, p.is_premium
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

  -- Idempotencia: si el usuario reintenta con un checkout vigente, se reutiliza
  select r.id, pay.id into v_res_id, v_pay_id
  from public.reservations r
  join public.payments pay on pay.reservation_id = r.id
  where r.item_id = p_item_id and r.renter_id = v_uid
    and r.start_date = p_start_date and r.end_date = p_end_date
    and r.status = 'pending' and pay.status = 'pending'
    and pay.checkout_expires_at > now()
  limit 1;

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

grant execute on function public.create_checkout(uuid, date, date) to authenticated;

-- El "webhook". SOLO backend (service_role) -- ver payments-checkout en
-- supabase/functions/. Aprobado -> pago 'paid', reserva 'confirmed'
-- (dispara asignación de locker + notificaciones), crea el damage hold.
-- Rechazado/expirado -> pago 'failed', reserva 'cancelled', notifica.
create function public.apply_payment_result(
  p_payment_id uuid,
  p_outcome text,
  p_transaction_id text,
  p_card_brand text default null,
  p_card_last4 text default null,
  p_failure_reason text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table (payment_status public.payment_status, reservation_status public.reservation_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay record;
  v_res record;
  v_inserted int;
begin
  if p_outcome not in ('approved', 'declined', 'error', 'expired') then
    raise exception 'INVALID_OUTCOME' using errcode = '22023';
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if v_pay.id is null then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into v_res from public.reservations where id = v_pay.reservation_id for update;

  -- Idempotencia: el mismo evento dos veces no hace nada
  insert into public.payment_events (payment_id, provider, environment, event_key, outcome, provider_transaction_id, payload)
  values (v_pay.id, v_pay.provider, v_pay.environment,
          coalesce(p_transaction_id, gen_random_uuid()::text) || ':' || p_outcome,
          p_outcome, p_transaction_id, coalesce(p_payload, '{}'::jsonb))
  on conflict (event_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 or v_pay.status <> 'pending' then
    payment_status := v_pay.status;
    reservation_status := v_res.status;
    return next;
    return;
  end if;

  if p_outcome = 'approved' then
    if v_res.status <> 'pending' then
      -- Aprobación tardía (checkout ya vencido/cancelado): se reembolsa automáticamente
      update public.payments
        set status = 'refunded', provider_reference = p_transaction_id,
            card_brand = p_card_brand, card_last4 = p_card_last4,
            paid_at = now(), failure_reason = 'late_approval_auto_refund'
      where id = v_pay.id;
    else
      update public.payments
        set status = 'paid', paid_at = now(), provider_reference = p_transaction_id,
            card_brand = p_card_brand, card_last4 = p_card_last4, failure_reason = null
      where id = v_pay.id;

      insert into public.damage_holds (reservation_id, amount_held, status, provider)
      values (v_res.id, v_res.damage_liability_amount, 'held', 'simulated')
      on conflict (reservation_id) do nothing;

      -- Dispara asignación de locker + notificaciones (triggers existentes)
      update public.reservations set status = 'confirmed' where id = v_res.id;
    end if;
  else
    update public.payments
      set status = 'failed', provider_reference = coalesce(p_transaction_id, provider_reference),
          card_brand = p_card_brand, card_last4 = p_card_last4,
          failure_reason = coalesce(p_failure_reason, p_outcome)
    where id = v_pay.id;

    if v_res.status = 'pending' then
      update public.reservations set status = 'cancelled' where id = v_res.id;
    end if;

    if p_outcome <> 'expired' then
      insert into public.notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (v_res.renter_id, 'payment', 'Pago rechazado',
              'Tu pago no se completó. Puedes intentarlo de nuevo con otra tarjeta.',
              v_res.id, false, now());
    end if;
  end if;

  select p.status, r.status into payment_status, reservation_status
  from public.payments p join public.reservations r on r.id = p.reservation_id
  where p.id = v_pay.id;
  return next;
end;
$$;

grant execute on function public.apply_payment_result(uuid, text, text, text, text, text, jsonb) to service_role;

-- Cancelación -> reembolso simulado + liberar depósito
create function public.on_reservation_cancelled_settle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.payments set status = 'refunded', failure_reason = coalesce(failure_reason, 'reservation_cancelled')
      where reservation_id = new.id and status in ('paid', 'authorized');
    update public.payments set status = 'failed', failure_reason = coalesce(failure_reason, 'reservation_cancelled')
      where reservation_id = new.id and status = 'pending';
    update public.damage_holds set status = 'cancelled', released_at = now()
      where reservation_id = new.id and status = 'held';
  end if;
  return new;
end;
$$;

create trigger settle_payment_after_cancel
  after update of status on public.reservations
  for each row execute function public.on_reservation_cancelled_settle();

-- Checkouts vencidos: liberan las fechas cada 5 minutos (cron, sección 23)
create function public.expire_stale_checkouts()
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
    select id from public.payments
    where status = 'pending' and checkout_expires_at is not null and checkout_expires_at < now()
    for update skip locked
  loop
    perform public.apply_payment_result(v_row.id, 'expired', 'expire:' || v_row.id::text,
                                        null, null, 'checkout_expired', '{}'::jsonb);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

grant execute on function public.expire_stale_checkouts() to service_role;


-- ────────────────────────────────────────────────────────────────────
-- 12. DAMAGE HOLDS  (depósito de garantía simulado)
-- ────────────────────────────────────────────────────────────────────
create table public.damage_holds (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  amount_held numeric(10, 2) not null check (amount_held >= 0),
  status text not null default 'held' check (status in ('held', 'released', 'captured', 'partially_captured', 'cancelled')),
  captured_amount numeric(10, 2) not null default 0 check (captured_amount >= 0),
  provider text not null default 'simulated',
  provider_reference text,
  dispute_id uuid,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  captured_at timestamptz
);

comment on table public.damage_holds is 'Simulated damage-liability hold, one per reservation. provider/provider_reference are ready for a real Wompi hold once the Wompi blocker is resolved.';

create index damage_holds_reservation_idx on public.damage_holds(reservation_id);

-- Libera un hold sin captura -- el camino de "devolución sin incidente".
-- Se llama sobre todo desde locker-access (service_role) al confirmar
-- una devolución limpia; también invocable por cualquier participante.
create function public.release_damage_hold(p_reservation_id uuid)
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

-- Captura hasta el monto retenido por un reporte de daño confirmado y
-- exonera la comisión de Lendrop en esa reserva. Auto-reporte del
-- lender por ahora -- requiere revisión real antes de exponerse en UI
-- (un lender deshonesto podría auto-reportar daño para evadir comisión
-- y capturar el depósito del renter). Nadie puede llamarla desde el
-- cliente: ver el REVOKE en la sección 22.
create function public.capture_damage_hold(
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


-- ────────────────────────────────────────────────────────────────────
-- 13. PHOTO EVIDENCE  (foto obligatoria antes/después)
-- ────────────────────────────────────────────────────────────────────
create table public.photo_evidence (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  stage text not null check (stage in ('drop_off', 'pick_up', 'return_drop_off', 'return_pick_up')),
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);


-- ────────────────────────────────────────────────────────────────────
-- 14. REVIEWS  (calificación reservation-gated, ambas partes)
-- ────────────────────────────────────────────────────────────────────
-- Distinta de item_reviews (sección 20): esta requiere una reserva
-- 'completed' y permite que CUALQUIERA de las dos partes califique a la
-- otra (renter -> lender, lender -> renter), no solo el renter sobre el
-- artículo. Ambas alimentan el mismo agregado profiles.average_rating.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  reviewee_id uuid not null references public.profiles(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (reservation_id, reviewer_id)
);

create index reviews_reviewee_idx on public.reviews(reviewee_id);

-- Recalcula el rating público de un lender a partir de AMBAS fuentes:
-- reviews (reservation-gated) e item_reviews (por artículo).
-- SECURITY DEFINER porque profiles_update_own solo permite
-- auth.uid() = id -- sin esto, calificar a alguien MÁS nunca lograría
-- actualizar SU fila bajo RLS.
create function public.refresh_owner_rating(target_owner uuid)
returns void
language plpgsql
security definer
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

create function public.update_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_owner_rating(new.reviewee_id);
  return new;
end;
$$;

create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.update_profile_rating();

-- Notifica al reviewee (la parte que NO escribió la reseña)
create function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer_name text;
begin
  select full_name into reviewer_name from public.profiles where id = new.reviewer_id;

  insert into public.notifications (user_id, type, title, body, related_id)
  values (
    new.reviewee_id,
    'review',
    coalesce(reviewer_name, 'Someone') || ' left you a review',
    new.comment,
    new.reservation_id
  );

  return new;
end;
$$;

create trigger on_review_created_notify
  after insert on public.reviews
  for each row execute function public.notify_new_review();


-- ────────────────────────────────────────────────────────────────────
-- 15. NOTIFICATIONS
-- ────────────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_unread_idx on public.notifications(user_id) where is_read = false;

-- Reserva confirmada / devolución confirmada / daño reportado -> avisa
-- a AMBAS partes (renter y lender), no solo al renter. El recordatorio
-- de devolución (sección 23, cron) sigue siendo solo para el renter --
-- es quien tiene el artículo físicamente para devolver.
create function public.notify_reservation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_owner uuid;
  item_title text;
begin
  if new.status is distinct from old.status then
    select owner_id, title into item_owner, item_title from public.items where id = new.item_id;

    if new.status = 'confirmed' then
      insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (
        new.renter_id,
        'reservation',
        'Reserva confirmada',
        'Tu reserva ha sido confirmada. Del ' || new.start_date || ' al ' || new.end_date || '.',
        new.id,
        false,
        now()
      );

      if item_owner is not null and item_owner is distinct from new.renter_id then
        insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
        values (
          item_owner,
          'reservation',
          'Nueva reserva confirmada',
          coalesce(item_title, 'Tu artículo') || ' fue reservado del ' || new.start_date || ' al ' || new.end_date || '.',
          new.id,
          false,
          now()
        );
      end if;

    elsif new.status = 'completed' then
      insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (
        new.renter_id,
        'reservation',
        'Depósito liberado',
        'Tu depósito ha sido liberado. La reserva se completó correctamente.',
        new.id,
        false,
        now()
      );

      if item_owner is not null and item_owner is distinct from new.renter_id then
        insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
        values (
          item_owner,
          'reservation',
          'Devolución confirmada',
          coalesce(item_title, 'Tu artículo') || ' fue devuelto y la reserva se completó correctamente.',
          new.id,
          false,
          now()
        );
      end if;

    elsif new.status = 'disputed' then
      insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (
        new.renter_id,
        'dispute',
        'Daño reportado en tu alquiler',
        'El lender reportó daño al recibir la devolución. Tu depósito queda retenido mientras se revisa.',
        new.id,
        false,
        now()
      );

      if item_owner is not null and item_owner is distinct from new.renter_id then
        insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
        values (
          item_owner,
          'dispute',
          'Reporte de daño enviado',
          'Tu reporte de daño quedó registrado. El depósito permanece retenido mientras se revisa.',
          new.id,
          false,
          now()
        );
      end if;

    end if;
  end if;
  return new;
end;
$$;

create trigger trg_notify_reservation_status
  after update on public.reservations
  for each row execute function public.notify_reservation_status_change();

-- Recordatorio diario de devolución (cron en la sección 23)
create function public.send_return_reminders()
returns void
language plpgsql
set search_path = public
as $$
begin
  insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
  select
    r.renter_id,
    'reservation',
    'Recordatorio de devolución',
    'Recuerda devolver el artículo antes del ' || r.end_date || '.',
    r.id,
    false,
    now()
  from reservations r
  where r.status = 'active'
    and r.end_date = current_date + 1
    and not exists (
      select 1 from notifications n
      where n.related_id = r.id
        and n.title = 'Recordatorio de devolución'
    );
end;
$$;


-- ────────────────────────────────────────────────────────────────────
-- 16. IDENTITY VERIFICATIONS
-- ────────────────────────────────────────────────────────────────────
-- Requerida para publicar un artículo y para reservar uno (ver
-- items_insert_own / reservations_insert_own en la sección 22).
create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  document_type text not null check (document_type in ('dui', 'passport')),
  document_front_path text not null,
  document_back_path text,
  selfie_path text,
  status verification_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create function public.is_identity_verified(p_user_id uuid default null)
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

-- Único camino legítimo para cambiar profiles.verification_status:
-- se auto-concede permiso momentáneo (protect_verification_status en
-- la sección 4 lo exige) y lo revoca enseguida.
create function public.sync_verification_status()
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

create trigger sync_profile_verification_status
  after insert or update of status on public.identity_verifications
  for each row execute function public.sync_verification_status();


-- ────────────────────────────────────────────────────────────────────
-- 17. FAVORITES
-- ────────────────────────────────────────────────────────────────────
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);


-- ────────────────────────────────────────────────────────────────────
-- 18. DISPUTES
-- ────────────────────────────────────────────────────────────────────
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id),
  raised_by uuid not null references public.profiles(id),
  reason text not null,
  status dispute_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index disputes_reservation_idx on public.disputes(reservation_id);

alter table public.damage_holds
  add constraint damage_holds_dispute_id_fkey foreign key (dispute_id) references public.disputes(id);


-- ────────────────────────────────────────────────────────────────────
-- 19. MENSAJERÍA (conversations + messages)
-- ────────────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
  item_id uuid references public.items(id),
  created_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.messages is 'DECISIÓN DE PRODUCTO PENDIENTE: la mensajería directa puede contradecir la propuesta de valor "sin coordinación" de Lendrop (el locker ya resuelve la entrega sin que ambas partes se hablen). Incluida en el schema para no bloquear a backend, pero debe confirmarse con el equipo de producto antes de exponerse en la UI — o limitarse a mensajes predefinidos / soporte, no chat libre.';

create index messages_conversation_idx on public.messages(conversation_id);

-- Crea (o reutiliza) una conversación de dos participantes.
create function public.start_conversation(other_user_id uuid, p_item_id uuid default null, p_reservation_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
begin
  if other_user_id is null or other_user_id = auth.uid() then
    raise exception 'Invalid conversation participant';
  end if;

  select c.id into existing_id
  from public.conversations c
  join public.conversation_participants me on me.conversation_id = c.id and me.user_id = auth.uid()
  join public.conversation_participants them on them.conversation_id = c.id and them.user_id = other_user_id
  where c.item_id is not distinct from p_item_id
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations (item_id, reservation_id)
  values (p_item_id, p_reservation_id)
  returning id into new_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (new_id, auth.uid()), (new_id, other_user_id);

  return new_id;
end;
$$;

grant execute on function public.start_conversation(uuid, uuid, uuid) to authenticated;

-- Notifica a cada OTRO participante de la conversación
create function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  recipient uuid;
begin
  select full_name into sender_name from public.profiles where id = new.sender_id;

  for recipient in
    select cp.user_id
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id
  loop
    insert into public.notifications (user_id, type, title, body, related_id)
    values (
      recipient,
      'message',
      coalesce(sender_name, 'Lendrop user') || ' sent you a message',
      left(new.body, 140),
      new.conversation_id
    );
  end loop;

  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute function public.notify_new_message();


-- ────────────────────────────────────────────────────────────────────
-- 20. HOST ONBOARDING
-- ────────────────────────────────────────────────────────────────────
-- Progreso del wizard "conviértete en lender" -- una fila por usuario,
-- se crea la primera vez que abre el wizard (no en el trigger de
-- signup: la mayoría de usuarios nunca lo hacen).
create table public.host_onboarding (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_step text not null default 'intro',
  phone text,
  city text,
  zone text,
  categories_interest text[] not null default '{}',
  terms_accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger host_onboarding_set_updated_at
  before update on public.host_onboarding
  for each row execute function public.set_updated_at();


-- ────────────────────────────────────────────────────────────────────
-- 21. ITEM REVIEWS  (comentario/estrella por artículo, cualquier renter)
-- ────────────────────────────────────────────────────────────────────
-- Más ligera que "reviews" (sección 14): no requiere una reserva
-- 'completed' específica al momento de escribir en el ORIGEN (la
-- policy sí exige haber alquilado el artículo alguna vez), y es
-- reviewer -> item, no reviewer -> persona por reserva puntual. Ambas
-- alimentan el mismo agregado de reputación del lender.
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

create function public.on_item_review_change()
returns trigger
language plpgsql
security definer
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

create function public.notify_new_item_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  reviewer_name text;
  item_title text;
begin
  select i.owner_id, i.title into owner, item_title from public.items i where i.id = new.item_id;
  if owner is null or owner = new.reviewer_id then
    return new;
  end if;

  select full_name into reviewer_name from public.profiles where id = new.reviewer_id;

  insert into public.notifications (user_id, type, title, body, related_id)
  values (
    owner,
    'review',
    coalesce(reviewer_name, 'Someone') || ' reviewed ' || coalesce(item_title, 'your listing'),
    new.comment,
    new.item_id
  );

  return new;
end;
$$;

create trigger on_item_review_created
  after insert on public.item_reviews
  for each row execute function public.notify_new_item_review();


-- ────────────────────────────────────────────────────────────────────
-- 22. PAYMENT METHODS  (tarjetas guardadas -- solo marca/last4)
-- ────────────────────────────────────────────────────────────────────
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'wompi',
  provider_token text not null,
  brand text,
  last4 text check (last4 is null or length(last4) = 4),
  expiry_month smallint check (expiry_month between 1 and 12),
  expiry_year smallint,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.payment_methods is 'Tokenized payment method references only (brand/last4/expiry for display) — never raw card numbers or CVC. The real card data lives with the payment provider (Wompi).';

create function public.on_payment_method_set_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_default then
    update public.payment_methods
    set is_default = false
    where user_id = new.user_id
      and id <> new.id
      and is_default;
  end if;
  return new;
end;
$$;

create trigger payment_method_set_default
  before insert or update on public.payment_methods
  for each row execute function public.on_payment_method_set_default();


-- ────────────────────────────────────────────────────────────────────
-- 23. PRICE SUGGESTIONS CACHE  (sugerencia de precio con IA)
-- ────────────────────────────────────────────────────────────────────
create table public.price_suggestions_cache (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  cache_key text not null,
  min_price numeric(10, 2) not null check (min_price > 0),
  max_price numeric(10, 2) not null check (max_price >= min_price),
  reasoning text,
  source text not null check (source in ('comparables', 'ai')),
  created_at timestamptz not null default now(),
  unique (category, cache_key)
);

comment on table public.price_suggestions_cache is 'Cached price-range suggestions (14-day TTL, enforced by the Edge Function''s freshness check, not a DB expiry). category + sha256(category:normalized_description) as the cache key.';


-- ────────────────────────────────────────────────────────────────────
-- 24. USER PREFERENCES
-- ────────────────────────────────────────────────────────────────────
create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  notify_messages boolean not null default true,
  notify_reservations boolean not null default true,
  notify_reviews boolean not null default true,
  default_city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_preferences is 'Per-user app preferences (notification mute toggles, default browsing city). Owner-only — never exposed to public reads.';

create trigger set_user_preferences_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();


-- ────────────────────────────────────────────────────────────────────
-- 25. ADMIN
-- ────────────────────────────────────────────────────────────────────
-- profiles.is_admin ya está declarado en la sección 4. El guard de abajo
-- evita que un usuario se autopromueva: profiles_update_own (sección 22)
-- deja que cualquiera actualice SU propia fila, y RLS es por fila, no
-- por columna -- sin esto, un cliente podría simplemente hacer
-- `update({ is_admin: true })` sobre sí mismo. auth.role() solo existe
-- en llamadas vía API (PostgREST) con JWT; una conexión SQL directa
-- (migraciones, SQL Editor) no tiene ese contexto y pasa sin bloqueo --
-- así se otorga el primer admin, más abajo.
create function public.prevent_self_admin_promotion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.role() <> 'service_role' then
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger guard_is_admin_column
  before update on public.profiles
  for each row execute function public.prevent_self_admin_promotion();


-- ════════════════════════════════════════════════════════════════════
-- 26. ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════════
-- A partir de aquí activamos RLS en TODAS las tablas. Sin una policy
-- explícita que lo permita, el acceso queda BLOQUEADO por defecto para
-- cualquier usuario autenticado o anónimo (solo el "service role" del
-- backend puede saltarse esto — úsalo solo en Edge Functions de confianza).

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.lockers enable row level security;
alter table public.locker_compartments enable row level security;
alter table public.reservations enable row level security;
alter table public.locker_events enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.damage_holds enable row level security;
alter table public.photo_evidence enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.favorites enable row level security;
alter table public.disputes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.host_onboarding enable row level security;
alter table public.item_reviews enable row level security;
alter table public.payment_methods enable row level security;
alter table public.price_suggestions_cache enable row level security;
alter table public.user_preferences enable row level security;

-- PROFILES: cualquiera puede ver perfiles públicos; solo el dueño edita el suyo.
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- PROFILE PRIVATE: SOLO el dueño puede leer su propio DUI/fecha de
-- nacimiento. Sin policy de "select all" — a propósito. Sin policy de
-- update — corregir un DUI debe pasar por soporte, no autoedición.
create policy "profile_private_select_own" on public.profile_private
  for select using (user_id = auth.uid());
create policy "profile_private_insert_own" on public.profile_private
  for insert with check (user_id = auth.uid());

-- CATEGORIES: lectura pública. La escritura queda reservada al service role.
create policy "categories_select_all" on public.categories for select using (true);

-- ITEMS: cualquiera ve artículos disponibles; el dueño ve y gestiona los suyos;
-- un admin ve TODOS (para el panel de monitoreo, sección "admin_panel").
create policy "items_select_available_or_own" on public.items
  for select using (is_available = true or owner_id = auth.uid());
create policy "items_select_admin" on public.items
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
create policy "items_insert_own" on public.items
  for insert with check (owner_id = auth.uid() and public.is_identity_verified());
create policy "items_update_own" on public.items
  for update using (owner_id = auth.uid());
create policy "items_delete_own" on public.items
  for delete using (owner_id = auth.uid());

-- ITEM PHOTOS: siguen la visibilidad/propiedad del artículo.
create policy "item_photos_select" on public.item_photos
  for select using (
    exists (select 1 from public.items i where i.id = item_photos.item_id and (i.is_available = true or i.owner_id = auth.uid()))
  );
create policy "item_photos_manage_own" on public.item_photos
  for all using (
    exists (select 1 from public.items i where i.id = item_photos.item_id and i.owner_id = auth.uid())
  );

-- LOCKERS / COMPARTMENTS: lectura para cualquier usuario autenticado
-- (necesario para mostrar cobertura de lockers). Sin policies de
-- escritura para el cliente — los gestiona el service role.
create policy "lockers_select_authenticated" on public.lockers
  for select using (auth.role() = 'authenticated');
create policy "compartments_select_authenticated" on public.locker_compartments
  for select using (auth.role() = 'authenticated');

-- RESERVATIONS: el arrendatario ve las suyas; el dueño del artículo ve
-- las reservas hechas sobre SUS artículos; un admin ve TODAS.
create policy "reservations_select_involved" on public.reservations
  for select using (
    renter_id = auth.uid()
    or exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );
create policy "reservations_select_admin" on public.reservations
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));
-- Rentar exige identidad verificada.
create policy "reservations_insert_own" on public.reservations
  for insert with check (renter_id = auth.uid() and public.is_identity_verified());
-- El UPDATE en sí lo permite esta policy; QUÉ se puede cambiar lo
-- restringe guard_reservation_client_update() (sección 9): el cliente
-- solo puede cancelar antes del drop-off, nada más.
create policy "reservations_update_involved" on public.reservations
  for update using (
    renter_id = auth.uid()
    or exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );

-- LOCKER EVENTS: cada quien ve los eventos de sus propias reservas.
create policy "locker_events_select_involved" on public.locker_events
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = locker_events.reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- PAYMENTS: cada quien ve los pagos de sus propias reservas; un admin ve TODOS.
create policy "payments_select_involved" on public.payments
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );
create policy "payments_select_admin" on public.payments
  for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- PAYMENT EVENTS: solo lectura para admins (bitácora interna de la pasarela).
create policy "payment_events_select_admin" on public.payment_events
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- DAMAGE HOLDS: cada quien ve el hold de sus propias reservas.
create policy "damage_holds_select_involved" on public.damage_holds
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- PHOTO EVIDENCE: solo los participantes de la reserva.
create policy "photo_evidence_select_involved" on public.photo_evidence
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );
create policy "photo_evidence_insert_involved" on public.photo_evidence
  for insert with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- REVIEWS: lectura pública (reputación). Solo se puede calificar a la
-- OTRA parte de una reserva ya 'completed' -- reviewee_id debe ser
-- exactamente el renter o el owner de esa reserva específica, nunca un
-- tercero ni uno mismo.
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_participant" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and reviewee_id <> auth.uid()
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id
        and r.status = 'completed'
        and (
          (r.renter_id = auth.uid() and reviewee_id = i.owner_id)
          or (i.owner_id = auth.uid() and reviewee_id = r.renter_id)
        )
    )
  );

-- NOTIFICATIONS: cada quien ve y marca como leídas solo las suyas.
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- IDENTITY VERIFICATIONS: solo el dueño ve/crea las suyas.
create policy "identity_verifications_select_own" on public.identity_verifications
  for select using (user_id = auth.uid());
create policy "identity_verifications_insert_own" on public.identity_verifications
  for insert with check (user_id = auth.uid());

-- FAVORITES: solo el dueño gestiona los suyos.
create policy "favorites_all_own" on public.favorites
  for all using (user_id = auth.uid());

-- DISPUTES: los participantes de la reserva ven y pueden abrir una.
create policy "disputes_select_involved" on public.disputes
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );
create policy "disputes_insert_participant" on public.disputes
  for insert with check (
    raised_by = auth.uid()
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- MENSAJERÍA: solo participantes de la conversación.
-- NOTA DE DESVIACIÓN DEL ESTADO EN VIVO: las policies live de
-- messages_select_participant / messages_insert_participant tienen un
-- bug real (`cp.conversation_id = cp.conversation_id`, una tautología
-- que nunca compara contra messages.conversation_id) -- cualquier
-- participante de CUALQUIER conversación pasa el filtro, no solo el de
-- la conversación del mensaje. Corregido aquí a propósito (no
-- reproducido tal cual) porque este archivo es la referencia de
-- instalación limpia, no debe perpetuar un bug de control de acceso a
-- proyectos nuevos. La base de datos EN VIVO sigue teniendo el bug sin
-- corregir -- esta tarea fue de solo lectura, sin aplicar cambios de
-- schema remotos. Repórtalo aparte para decidir si se corrige en vivo.
create policy "conversations_select_participant" on public.conversations
  for select using (
    exists (select 1 from public.conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid())
  );
create policy "participants_select_own" on public.conversation_participants
  for select using (user_id = auth.uid());
create policy "messages_select_participant" on public.messages
  for select using (
    exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
  );
create policy "messages_insert_participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
  );

-- HOST ONBOARDING: solo el dueño de su propio progreso.
create policy "host_onboarding_select_own" on public.host_onboarding
  for select using (auth.uid() = user_id);
create policy "host_onboarding_insert_own" on public.host_onboarding
  for insert with check (auth.uid() = user_id);
create policy "host_onboarding_update_own" on public.host_onboarding
  for update using (auth.uid() = user_id);

-- ITEM REVIEWS: reputación pública; solo puede reseñar quien alquiló
-- el artículo (confirmed/active/completed) y no es el propio dueño.
create policy "item_reviews_select_all" on public.item_reviews for select using (true);
create policy "item_reviews_insert_own" on public.item_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and not exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
    and exists (
      select 1 from public.reservations r
      where r.item_id = item_reviews.item_id
        and r.renter_id = auth.uid()
        and r.status in ('confirmed', 'active', 'completed')
    )
  );
create policy "item_reviews_update_own" on public.item_reviews
  for update using (reviewer_id = auth.uid());
create policy "item_reviews_delete_own" on public.item_reviews
  for delete using (reviewer_id = auth.uid());

-- PAYMENT METHODS: solo el dueño gestiona las suyas.
create policy "payment_methods_select_own" on public.payment_methods
  for select using (user_id = auth.uid());
create policy "payment_methods_insert_own" on public.payment_methods
  for insert with check (user_id = auth.uid());
create policy "payment_methods_update_own" on public.payment_methods
  for update using (user_id = auth.uid());
create policy "payment_methods_delete_own" on public.payment_methods
  for delete using (user_id = auth.uid());

-- USER PREFERENCES: solo el dueño lee/escribe las suyas.
create policy "user_preferences_select_own" on public.user_preferences
  for select using (user_id = auth.uid());
create policy "user_preferences_insert_own" on public.user_preferences
  for insert with check (user_id = auth.uid());
create policy "user_preferences_update_own" on public.user_preferences
  for update using (user_id = auth.uid());

-- price_suggestions_cache: RLS activo, sin policies -- es una cache
-- interna que solo lee/escribe la Edge Function suggest-price (service_role).


-- ════════════════════════════════════════════════════════════════════
-- 27. SEGURIDAD DE FUNCIONES: revocar EXECUTE de triggers y RPCs de dinero
-- ════════════════════════════════════════════════════════════════════
-- Nadie llama por RPC a funciones de trigger ni a funciones que mueven
-- dinero/depósitos -- esas solo deben dispararse solas (triggers) o
-- ejecutarse desde el backend (service_role). Ver 0024 para el
-- historial completo de este endurecimiento.

revoke execute on function public.assign_compartment_on_confirm()              from public, anon, authenticated;
revoke execute on function public.release_compartment_on_cancel()              from public, anon, authenticated;
revoke execute on function public.release_compartment_on_reservation_delete()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()                            from public, anon, authenticated;
revoke execute on function public.notify_new_item_review()                     from public, anon, authenticated;
revoke execute on function public.notify_new_message()                         from public, anon, authenticated;
revoke execute on function public.notify_new_review()                          from public, anon, authenticated;
revoke execute on function public.notify_reservation_status_change()           from public, anon, authenticated;
revoke execute on function public.on_item_review_change()                      from public, anon, authenticated;
revoke execute on function public.sync_verification_status()                   from public, anon, authenticated;
revoke execute on function public.update_profile_rating()                      from public, anon, authenticated;
revoke execute on function public.refresh_owner_rating(uuid)                   from public, anon, authenticated;

-- Dinero: solo backend. Liberar depósito ya lo hace locker-access
-- (service_role) en una devolución limpia; capturar requiere revisión
-- de disputa real (no expuesto en producto todavía).
revoke execute on function public.release_damage_hold(uuid)                    from public, anon, authenticated;
revoke execute on function public.capture_damage_hold(uuid, numeric, uuid)     from public, anon, authenticated;

-- Funciones de usuario: requieren sesión (nunca anon)
revoke execute on function public.create_simulated_reservation(uuid, date, date) from public, anon;
revoke execute on function public.create_pending_reservation(uuid, date, date)   from public, anon;
revoke execute on function public.start_conversation(uuid, uuid, uuid)           from public, anon;
revoke execute on function public.is_identity_verified(uuid)                     from public, anon;
grant  execute on function public.is_identity_verified(uuid)                     to authenticated;
-- get_item_booked_ranges / get_currently_rented_item_ids (sección 28)
-- quedan públicas a propósito: solo exponen fechas ocupadas e ids,
-- necesarias para Explore sin login.

revoke execute on function public.create_checkout(uuid, date, date) from public, anon;
grant  execute on function public.create_checkout(uuid, date, date) to authenticated;

revoke execute on function public.apply_payment_result(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant  execute on function public.apply_payment_result(uuid, text, text, text, text, text, jsonb) to service_role;

revoke execute on function public.on_reservation_cancelled_settle() from public, anon, authenticated;

revoke execute on function public.expire_stale_checkouts() from public, anon, authenticated;
grant  execute on function public.expire_stale_checkouts() to service_role;

revoke execute on function public.guard_reservation_client_update() from public, anon, authenticated;


-- ────────────────────────────────────────────────────────────────────
-- 28. RPCS PÚBLICOS DE SOLO LECTURA  (Explore sin login)
-- ────────────────────────────────────────────────────────────────────
create function public.get_item_booked_ranges(p_item_id uuid)
returns table (start_date date, end_date date, status reservation_status)
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

create function public.get_currently_rented_item_ids()
returns table (item_id uuid)
language sql
stable security definer
set search_path = public
as $$
  select distinct r.item_id
  from public.reservations r
  where r.status in ('confirmed', 'active')
    and current_date between r.start_date and r.end_date
$$;


-- ────────────────────────────────────────────────────────────────────
-- 29. ADMIN: primer admin
-- ────────────────────────────────────────────────────────────────────
-- Ajusta el correo antes de correr en un proyecto nuevo, o comenta esta
-- línea y otorga el primer admin a mano después (ver README/CLAUDE.md).
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'diegodiaz2552@gmail.com');


-- ════════════════════════════════════════════════════════════════════
-- 30. STORAGE BUCKETS
-- ════════════════════════════════════════════════════════════════════
-- item-photos: público, cualquiera ve fotos de artículos; solo el
-- dueño sube/edita/borra en su propia carpeta {auth.uid()}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-photos', 'item-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "item_photos_bucket_select_all" on storage.objects for select using (bucket_id = 'item-photos');
create policy "item_photos_bucket_insert_own" on storage.objects for insert
  with check (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "item_photos_bucket_update_own" on storage.objects for update
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "item_photos_bucket_delete_own" on storage.objects for delete
  using (bucket_id = 'item-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- profile-avatars: público, mismo patrón owner-only por carpeta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "profile_avatars_bucket_select_all" on storage.objects for select using (bucket_id = 'profile-avatars');
create policy "profile_avatars_bucket_insert_own" on storage.objects for insert
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_avatars_bucket_update_own" on storage.objects for update
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "profile_avatars_bucket_delete_own" on storage.objects for delete
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- avatars: bucket público equivalente, más antiguo -- se mantiene por
-- compatibilidad con el histórico del proyecto. Nuevo código sube a
-- profile-avatars.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars_bucket_select_all" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_bucket_insert_own" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_bucket_update_own" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars_bucket_delete_own" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- evidence-photos: PRIVADO -- solo los participantes de la reserva
-- (carpeta = {reservation_id}/...) ven o suben su propia evidencia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence-photos', 'evidence-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "evidence_photos_bucket_select_involved" on storage.objects for select
  using (
    bucket_id = 'evidence-photos'
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = ((storage.foldername(objects.name))[1])::uuid
        and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );
create policy "evidence_photos_bucket_insert_involved" on storage.objects for insert
  with check (
    bucket_id = 'evidence-photos'
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = ((storage.foldername(objects.name))[1])::uuid
        and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- identity-documents: PRIVADO -- solo el dueño ve/sube los suyos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "identity_documents_insert_own" on storage.objects for insert
  with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "identity_documents_select_own" on storage.objects for select
  using (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = auth.uid()::text);


-- ════════════════════════════════════════════════════════════════════
-- 31. CRON JOBS  (requiere la extensión pg_cron habilitada)
-- ════════════════════════════════════════════════════════════════════
select cron.schedule('recordatorio-devolucion-diario', '0 9 * * *', $$select public.send_return_reminders();$$);
select cron.schedule('expirar-checkouts', '*/5 * * * *', $$select public.expire_stale_checkouts();$$);


-- ════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ════════════════════════════════════════════════════════════════════
-- Siguiente paso: crear los buckets de Storage ya quedó cubierto arriba
-- (sección 30). Solo falta desplegar las Edge Functions
-- (supabase/functions/*) desde el dashboard o la CLI.

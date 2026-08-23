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
  updated_at timestamptz not null default now()
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
-- propia policy restrictiva (ver sección 20, RLS).
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
-- "security definer" es necesario porque este trigger necesita permiso
-- para escribir en tablas de public en nombre del usuario nuevo.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
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


-- ────────────────────────────────────────────────────────────────────
-- 5. CATEGORIES  (fuente única de verdad para la taxonomía)
-- ────────────────────────────────────────────────────────────────────
-- IMPORTANTE: esta tabla resuelve la inconsistencia detectada entre el
-- sitio de marketing (11 categorías) y la pantalla Explore de la app
-- (5 categorías). A partir de ahora AMBOS deben leer sus categorías
-- desde aquí — nunca hardcodeadas en el frontend.
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  icon text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

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
  deposit_amount numeric(10, 2) not null default 0 check (deposit_amount >= 0),
  currency text not null default 'USD',
  is_available boolean not null default true,
  location_city text not null default 'San Salvador',
  -- Columna generada automáticamente para búsqueda de texto en español.
  search_vector tsvector generated always as (
    to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, ''))
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_category_idx on public.items(category_id);
create index items_owner_idx on public.items(owner_id);
create index items_available_idx on public.items(is_available) where is_available = true;
create index items_search_idx on public.items using gin(search_vector);

create trigger set_items_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();


-- ────────────────────────────────────────────────────────────────────
-- 7. ITEM PHOTOS
-- ────────────────────────────────────────────────────────────────────
create table public.item_photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,  -- ruta dentro de Supabase Storage
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index item_photos_item_idx on public.item_photos(item_id);


-- ────────────────────────────────────────────────────────────────────
-- 8. LOCKERS  (ubicaciones físicas de la red de casilleros)
-- ────────────────────────────────────────────────────────────────────
create table public.lockers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text not null default 'San Salvador',
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);


-- ────────────────────────────────────────────────────────────────────
-- 9. LOCKER COMPARTMENTS  (cada casillero individual dentro de un locker)
-- ────────────────────────────────────────────────────────────────────
create table public.locker_compartments (
  id uuid primary key default gen_random_uuid(),
  locker_id uuid not null references public.lockers(id) on delete cascade,
  compartment_code text not null,  -- ej. "A3" — se muestra en fuente JetBrains Mono en la UI
  size text not null default 'medium' check (size in ('small', 'medium', 'large')),
  status compartment_status not null default 'available',
  created_at timestamptz not null default now(),
  unique (locker_id, compartment_code)
);

create index compartments_locker_idx on public.locker_compartments(locker_id);


-- ────────────────────────────────────────────────────────────────────
-- 10. RESERVATIONS
-- ────────────────────────────────────────────────────────────────────
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id),
  renter_id uuid not null references public.profiles(id),
  compartment_id uuid references public.locker_compartments(id),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status reservation_status not null default 'pending',
  total_price numeric(10, 2) not null check (total_price > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- ★ Restricción clave: evita que el MISMO artículo se reserve dos
  --   veces en fechas que se traslapan, mientras la reserva esté
  --   activa (pending/confirmed/active). Esto lo hace la base de datos
  --   sola — no depende de que el frontend valide bien las fechas.
  exclude using gist (
    item_id with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('pending', 'confirmed', 'active'))
);

create index reservations_item_idx on public.reservations(item_id);
create index reservations_renter_idx on public.reservations(renter_id);

create trigger set_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();


-- ────────────────────────────────────────────────────────────────────
-- 11. LOCKER EVENTS  (auditoría: quién abrió qué casillero y cuándo)
-- ────────────────────────────────────────────────────────────────────
create table public.locker_events (
  id uuid primary key default gen_random_uuid(),
  compartment_id uuid not null references public.locker_compartments(id),
  reservation_id uuid references public.reservations(id),
  actor_id uuid references public.profiles(id),
  event_type text not null check (event_type in ('opened', 'closed', 'item_deposited', 'item_retrieved')),
  occurred_at timestamptz not null default now()
);

comment on table public.locker_events is 'En producción, estos eventos los debe insertar un backend seguro (Edge Function) que valida el código físico del locker — no el cliente directamente.';

create index locker_events_reservation_idx on public.locker_events(reservation_id);
create index locker_events_compartment_idx on public.locker_events(compartment_id);


-- ────────────────────────────────────────────────────────────────────
-- 12. PAYMENTS
-- ────────────────────────────────────────────────────────────────────
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  currency text not null default 'USD',
  status payment_status not null default 'pending',
  provider text not null default 'wompi',
  provider_reference text,  -- id de transacción devuelto por Wompi
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.payments is 'Los cambios de estado de pago deben venir del webhook de Wompi vía Edge Function (service role), nunca escritos directamente por el cliente — por eso no tiene policies de insert/update para "authenticated".';

create index payments_reservation_idx on public.payments(reservation_id);


-- ────────────────────────────────────────────────────────────────────
-- 13. PHOTO EVIDENCE  (evidencia fotográfica del estado del artículo)
-- ────────────────────────────────────────────────────────────────────
create table public.photo_evidence (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  stage text not null check (stage in ('drop_off', 'pick_up', 'return_drop_off', 'return_pick_up')),
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index photo_evidence_reservation_idx on public.photo_evidence(reservation_id);


-- ────────────────────────────────────────────────────────────────────
-- 14. REVIEWS  (con recálculo automático del rating promedio)
-- ────────────────────────────────────────────────────────────────────
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

create function public.update_profile_rating()
returns trigger
language plpgsql
as $$
begin
  update public.profiles
  set
    average_rating = (
      select round(avg(rating)::numeric, 2) from public.reviews where reviewee_id = new.reviewee_id
    ),
    total_reviews = (
      select count(*) from public.reviews where reviewee_id = new.reviewee_id
    )
  where id = new.reviewee_id;
  return new;
end;
$$;

create trigger on_review_created
  after insert on public.reviews
  for each row execute function public.update_profile_rating();


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


-- ────────────────────────────────────────────────────────────────────
-- 16. IDENTITY VERIFICATIONS
-- ────────────────────────────────────────────────────────────────────
-- NOTA DE PRODUCTO: hoy la app de marketing promete "verificación con
-- IA", pero la implementación actual es un formulario con foto de
-- DUI/pasaporte. document_front_path/selfie_path están listos para
-- conectar un proveedor real (ej. reconocimiento facial + OCR) sin
-- cambiar el schema — pero hay que resolver esa brecha antes de
-- lanzar públicamente para no prometer algo que no existe todavía.
create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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

create index identity_verifications_user_idx on public.identity_verifications(user_id);


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
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  raised_by uuid not null references public.profiles(id),
  reason text not null,
  status dispute_status not null default 'open',
  resolution_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index disputes_reservation_idx on public.disputes(reservation_id);


-- ────────────────────────────────────────────────────────────────────
-- 19. MENSAJERÍA (conversations + messages)
-- ────────────────────────────────────────────────────────────────────
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete cascade,
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


-- ════════════════════════════════════════════════════════════════════
-- 20. ROW LEVEL SECURITY (RLS)
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
alter table public.photo_evidence enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.favorites enable row level security;
alter table public.disputes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

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

-- CATEGORIES: lectura pública. La escritura queda reservada al service role
-- (sin policy de insert/update/delete para authenticated/anon).
create policy "categories_select_all" on public.categories for select using (true);

-- ITEMS: cualquiera ve artículos disponibles; el dueño ve y gestiona los suyos.
create policy "items_select_available_or_own" on public.items
  for select using (is_available = true or owner_id = auth.uid());
create policy "items_insert_own" on public.items
  for insert with check (owner_id = auth.uid());
create policy "items_update_own" on public.items
  for update using (owner_id = auth.uid());
create policy "items_delete_own" on public.items
  for delete using (owner_id = auth.uid());

-- ITEM PHOTOS: visibles junto con su item; solo el dueño del item las gestiona.
create policy "item_photos_select" on public.item_photos
  for select using (
    exists (select 1 from public.items i where i.id = item_id and (i.is_available = true or i.owner_id = auth.uid()))
  );
create policy "item_photos_manage_own" on public.item_photos
  for all using (
    exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );

-- LOCKERS / COMPARTMENTS: lectura para cualquier usuario autenticado
-- (necesitan verlos para elegir dónde recoger/entregar). Escritura solo service role.
create policy "lockers_select_authenticated" on public.lockers
  for select using (auth.role() = 'authenticated');
create policy "compartments_select_authenticated" on public.locker_compartments
  for select using (auth.role() = 'authenticated');

-- RESERVATIONS: el arrendatario ve las suyas; el dueño del artículo ve
-- las reservas hechas sobre SUS artículos.
create policy "reservations_select_involved" on public.reservations
  for select using (
    renter_id = auth.uid()
    or exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );
create policy "reservations_insert_own" on public.reservations
  for insert with check (renter_id = auth.uid());
create policy "reservations_update_involved" on public.reservations
  for update using (
    renter_id = auth.uid()
    or exists (select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid())
  );

-- LOCKER EVENTS: visibles para quien participa en la reserva asociada.
create policy "locker_events_select_involved" on public.locker_events
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- PAYMENTS: solo lectura para los involucrados en la reserva.
-- Sin policies de insert/update -> los pagos SOLO los escribe el
-- backend (service role) al procesar el webhook de Wompi.
create policy "payments_select_involved" on public.payments
  for select using (
    exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- PHOTO EVIDENCE: los involucrados en la reserva pueden ver y subir evidencia.
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

-- REVIEWS: lectura pública (la reputación es visible para todos);
-- solo el que participó en la reserva puede escribir su reseña.
create policy "reviews_select_all" on public.reviews for select using (true);
create policy "reviews_insert_participant" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id
        and r.status = 'completed'
        and (r.renter_id = auth.uid() or i.owner_id = auth.uid())
    )
  );

-- NOTIFICATIONS: cada quien ve y marca como leídas solo las suyas.
create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- IDENTITY VERIFICATIONS: el usuario ve y sube la suya; NO puede
-- aprobarla él mismo (no hay policy de update para authenticated —
-- eso lo hace un revisor humano vía panel admin con service role).
create policy "identity_verifications_select_own" on public.identity_verifications
  for select using (user_id = auth.uid());
create policy "identity_verifications_insert_own" on public.identity_verifications
  for insert with check (user_id = auth.uid());

-- FAVORITES: control total sobre los propios favoritos.
create policy "favorites_all_own" on public.favorites
  for all using (user_id = auth.uid());

-- DISPUTES: visibles y creables por los involucrados en la reserva.
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

-- MENSAJERÍA: solo los participantes de la conversación pueden leer/escribir.
create policy "conversations_select_participant" on public.conversations
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = id and cp.user_id = auth.uid()
    )
  );
create policy "participants_select_own" on public.conversation_participants
  for select using (user_id = auth.uid());
create policy "messages_select_participant" on public.messages
  for select using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );
create policy "messages_insert_participant" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT
-- ════════════════════════════════════════════════════════════════════
-- Siguiente paso recomendado: crear los buckets de Supabase Storage
-- ("item-photos", "identity-documents", "evidence-photos") con sus
-- propias políticas de acceso — eso se configura desde Storage en el
-- dashboard, no desde este script SQL.

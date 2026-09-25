-- 0030_lendrop_id.sql
-- Lendrop ID: a private 6-character code per user (shown as ABC-123) that,
-- together with the DUI, opens a locker compartment. It replaces the
-- account password at the locker (see supabase/functions/locker-access).
--
-- ID de Lendrop: código privado de 6 caracteres por usuario (se muestra
-- como ABC-123). Junto con el DUI abre el compartimento del locker, en
-- lugar de la contraseña de la cuenta.
--
-- Where it lives / dónde vive: profile_private, the owner-only table
-- (RLS: select own, no update policy). The owner can read it; nobody can
-- write it from the client. Resetting goes through the lendrop-id Edge
-- Function, which checks the account password first.
--
-- Alphabet / alfabeto: 2-9 and A-Z without 0, 1, I, L, O (easy to misread
-- on a phone or a locker keypad) -> 31 symbols, 31^6 ≈ 887 million codes.
-- Stored without the dash, uppercase.

-- ── 1. Generator / generador ────────────────────────────────────────
-- Rejection sampling: a random byte is only used if it is below 248
-- (8 × 31), so every symbol is equally likely -- plain `byte % 31` would
-- favour the first 8 symbols. Retries until the code is unused.
create or replace function public.generate_lendrop_id()
returns text
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code text;
  b int;
begin
  loop
    code := '';
    while length(code) < 6 loop
      b := get_byte(gen_random_bytes(1), 0);
      if b < 248 then
        code := code || substr(alphabet, (b % 31) + 1, 1);
      end if;
    end loop;
    exit when not exists (select 1 from public.profile_private where lendrop_id = code);
  end loop;
  return code;
end;
$$;

-- ── 2. Column + backfill / columna + relleno ────────────────────────
alter table public.profile_private add column if not exists lendrop_id text;

-- One row at a time so each uniqueness check sees the codes already
-- assigned (a single UPDATE would check against a stale snapshot).
-- Fila por fila para que cada verificación vea los códigos ya asignados.
do $$
declare
  r record;
begin
  for r in select user_id from public.profile_private where lendrop_id is null loop
    update public.profile_private
      set lendrop_id = public.generate_lendrop_id()
      where user_id = r.user_id;
  end loop;
end;
$$;

-- New signups get one automatically: handle_new_user() inserts the
-- profile_private row without this column, so the default fills it.
-- Los registros nuevos lo reciben por el default de la columna.
alter table public.profile_private
  alter column lendrop_id set default public.generate_lendrop_id(),
  alter column lendrop_id set not null;

alter table public.profile_private
  add constraint profile_private_lendrop_id_key unique (lendrop_id),
  add constraint profile_private_lendrop_id_format check (lendrop_id ~ '^[2-9A-HJKMNP-Z]{6}$');

comment on column public.profile_private.lendrop_id is
  'ID de Lendrop: código privado de 6 caracteres (sin guion) para abrir el locker junto con el DUI. Solo lo ve el dueño.';

-- ── 3. Reset / regenerar ────────────────────────────────────────────
-- Called only by the lendrop-id Edge Function (service role) after it
-- has checked the account password. The old code stops working at once.
create or replace function public.regenerate_lendrop_id(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  update public.profile_private
    set lendrop_id = public.generate_lendrop_id()
    where user_id = p_user
    returning lendrop_id into new_code;
  return new_code;
end;
$$;

revoke execute on function public.generate_lendrop_id() from public, anon, authenticated;
revoke execute on function public.regenerate_lendrop_id(uuid) from public, anon, authenticated;
grant execute on function public.generate_lendrop_id() to service_role;
grant execute on function public.regenerate_lendrop_id(uuid) to service_role;

-- ── 4. Attempt log for rate limiting / registro de intentos ─────────
-- A 6-character code must not be guessable by trying: the Edge Functions
-- refuse after 5 failed attempts in 15 minutes. No policies on purpose:
-- only the service role reads or writes it.
-- Sin policies a propósito: solo el service role.
create table if not exists public.lendrop_id_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('locker', 'regenerate')),
  succeeded boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists lendrop_id_attempts_user_recent
  on public.lendrop_id_attempts (user_id, kind, created_at desc);

comment on table public.lendrop_id_attempts is
  'Intentos de verificación del ID de Lendrop / contraseña, para limitar reintentos. Sin policies: solo service role.';

alter table public.lendrop_id_attempts enable row level security;

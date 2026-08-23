-- ════════════════════════════════════════════════════════════════════
-- MIGRATION 0002 — Identity data (DUI, date of birth) + terms consent
-- ════════════════════════════════════════════════════════════════════
-- Run this ONLY if you already ran supabase_setup.sql before this file
-- existed (i.e. your Supabase project already has the `profiles` table
-- and the on_auth_user_created trigger). Paste this into SQL Editor and
-- hit Run — it's safe to run once, on top of the existing schema.
--
-- If you're setting up a BRAND NEW Supabase project instead, just run
-- the updated supabase_setup.sql — it already includes everything below,
-- you don't need to run this file separately.
--
-- ── WHY A SEPARATE TABLE INSTEAD OF ADDING COLUMNS TO "profiles"? ──────
-- The `profiles` table is intentionally public: anyone can read a
-- user's name, avatar, and rating (policy `profiles_select_all`, see
-- supabase_setup.sql) — that's needed to show "Listed by Carlos" on an
-- item page. A DUI number is a national ID (the Salvadoran equivalent
-- of an SSN). If we added a `dui` column to `profiles`, that public
-- policy would make EVERYONE's ID number readable by anyone with an
-- account — a serious data leak. Postgres Row Level Security works at
-- the ROW level, not the column level, so the fix isn't a smarter
-- policy on `profiles` — it's keeping sensitive fields in a separate
-- table that only the owner (and later, a verification reviewer) can
-- read.
-- ════════════════════════════════════════════════════════════════════

create table public.profile_private (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  dui text unique,
  date_of_birth date,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.profile_private is 'Sensitive identity data (DUI, date of birth) and consent timestamps. Never expose this table to public reads — only the owner (and later, staff reviewing identity verification) should be able to read it.';

alter table public.profile_private enable row level security;

create policy "profile_private_select_own" on public.profile_private
  for select using (user_id = auth.uid());

-- No update policy on purpose: letting a user silently rewrite their own
-- DUI after signup would defeat the point of collecting it (identity
-- swapping). Corrections should go through a support/admin flow later,
-- not a self-service edit.
create policy "profile_private_insert_own" on public.profile_private
  for insert with check (user_id = auth.uid());

-- ── Update the signup trigger to also populate profile_private ────────
-- CREATE OR REPLACE is safe here: it updates the function body in place,
-- the existing `on_auth_user_created` trigger keeps pointing to it — no
-- need to drop/recreate the trigger itself.
create or replace function public.handle_new_user()
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

-- ════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN 0002
-- ════════════════════════════════════════════════════════════════════

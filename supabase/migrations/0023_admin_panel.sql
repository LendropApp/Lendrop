-- 0023_admin_panel.sql
-- Fase 11: basic admin monitoring panel. Scoped exactly to the plan's
-- acceptance criterion -- a read-only table of all reservations with
-- their locker/payment status -- not dispute resolution (that stays a
-- known follow-up from 0013/0022).
--
-- No admin concept existed at all before this: no flag, no bypass RLS,
-- no route. This migration adds the minimum needed for an admin to see
-- ACROSS every user's reservations, not just their own.

alter table public.profiles add column is_admin boolean not null default false;

-- ── Guard is_admin against self-promotion ──────────────────────────────
-- profiles_update_own (supabase_setup.sql) lets a user update their OWN
-- row -- Postgres RLS is row-level, not column-level (same reasoning as
-- profile_private throughout this project), so without this trigger
-- any authenticated user could just do
-- `supabase.from('profiles').update({ is_admin: true })` on themselves
-- and gain read access to every other user's reservations and
-- payments. auth.role() is only set for PostgREST/API requests
-- ('authenticated', 'anon', or a real 'service_role' JWT) -- direct SQL
-- (this migration, the SQL Editor) has no JWT at all, so auth.role()
-- is null there and this guard is a no-op for that path, which is
-- exactly how the first admin gets granted below.
create or replace function public.prevent_self_admin_promotion()
returns trigger
language plpgsql
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

-- ── Admin read bypass ───────────────────────────────────────────────────
-- Multiple permissive policies on the same table OR together in
-- Postgres RLS, so these ADD admin visibility on top of the existing
-- participant-only policies without touching them. lockers/
-- locker_compartments are already select-able by any authenticated
-- user (supabase_setup.sql), so no bypass needed there.
create policy "reservations_select_admin" on public.reservations
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

create policy "payments_select_admin" on public.payments
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- items_select_available_or_own would otherwise silently drop the
-- nested item on any reservation whose item was later paused/deleted
-- by an owner who isn't the admin -- the monitoring table needs every
-- row's item regardless of availability.
create policy "items_select_admin" on public.items
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ── First admin ──────────────────────────────────────────────────────
update public.profiles
set is_admin = true
where id = (select id from auth.users where email = 'diegodiaz2552@gmail.com');

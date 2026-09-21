-- ════════════════════════════════════════════════════════════════════
-- MIGRATION 0003 — User preferences (notifications, browsing defaults)
-- ════════════════════════════════════════════════════════════════════
-- Run this ONLY if your Supabase project predates this file (i.e. you
-- already ran supabase_setup.sql before the Settings screen existed).
-- Paste this into SQL Editor and hit Run — safe to run once, on top of
-- the existing schema.
--
-- If you're setting up a BRAND NEW Supabase project instead, just run
-- the updated supabase_setup.sql — it already includes everything below.
--
-- ── WHY A SEPARATE TABLE INSTEAD OF COLUMNS ON "profiles"? ─────────────
-- Same reasoning as profile_private (see migration 0002): `profiles` is
-- publicly readable (policy `profiles_select_all`), so anything a user
-- wouldn't want a stranger reading — including which notification types
-- they've muted — belongs in its own owner-only table, not a column on
-- the public row.
-- ════════════════════════════════════════════════════════════════════

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

alter table public.user_preferences enable row level security;

create policy "user_preferences_select_own" on public.user_preferences
  for select using (user_id = auth.uid());
create policy "user_preferences_insert_own" on public.user_preferences
  for insert with check (user_id = auth.uid());
create policy "user_preferences_update_own" on public.user_preferences
  for update using (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════════════
-- END OF MIGRATION 0003
-- ════════════════════════════════════════════════════════════════════

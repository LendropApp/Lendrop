-- ════════════════════════════════════════════════════════════════════
-- LENDROP — RESET SCRIPT (destructive — dev/testing use only)
-- ════════════════════════════════════════════════════════════════════
-- Use this when you've deleted tables by hand (e.g. from the Table
-- Editor) and want to guarantee a truly clean slate before running
-- supabase_setup.sql again. Deleting tables through the UI does NOT
-- clean up everything the setup script created — the trigger on
-- auth.users and the enum types are left behind, and they'll make
-- supabase_setup.sql fail with "already exists" errors if you just
-- re-run it.
--
-- This script only touches what Lendrop's own SQL created. It does
-- NOT touch Supabase Auth (auth.users) or your project's URL/API keys
-- — those live outside the public schema and are untouched by this.
--
-- HOW TO USE:
--   1. Paste this whole file into Supabase SQL Editor and Run.
--      (Every line uses "if exists", so it's safe even if some of
--      these were already removed — nothing here will error.)
--   2. Then paste and run the full supabase_setup.sql, top to bottom.
--   3. Check Authentication > Users in the dashboard: if you had test
--      accounts from before, their auth login still exists but their
--      profile row is gone now (their `profiles` row was just
--      deleted). Delete those old test users there too, so you don't
--      end up with an account that can log in but has no profile.
-- ════════════════════════════════════════════════════════════════════

-- 1. Trigger on auth.users — not "owned" by any table below, so it
--    won't get cleaned up automatically when those tables are dropped.
drop trigger if exists on_auth_user_created on auth.users;

-- 2. Tables. CASCADE resolves foreign keys between them automatically,
--    so the order they're listed in doesn't matter.
drop table if exists public.messages cascade;
drop table if exists public.conversation_participants cascade;
drop table if exists public.conversations cascade;
drop table if exists public.disputes cascade;
drop table if exists public.favorites cascade;
drop table if exists public.identity_verifications cascade;
drop table if exists public.notifications cascade;
drop table if exists public.reviews cascade;
drop table if exists public.photo_evidence cascade;
drop table if exists public.payments cascade;
drop table if exists public.locker_events cascade;
drop table if exists public.reservations cascade;
drop table if exists public.locker_compartments cascade;
drop table if exists public.lockers cascade;
drop table if exists public.item_photos cascade;
drop table if exists public.items cascade;
drop table if exists public.categories cascade;
drop table if exists public.profile_private cascade;
drop table if exists public.profiles cascade;

-- 3. Standalone functions — not auto-dropped by removing a table,
--    since they're not "owned" by any one table.
drop function if exists public.handle_new_user() cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.update_profile_rating() cascade;

-- 4. Enum types — these are what usually survive a manual table
--    deletion and cause "type already exists" on the next setup run.
drop type if exists public.item_condition cascade;
drop type if exists public.reservation_status cascade;
drop type if exists public.payment_status cascade;
drop type if exists public.dispute_status cascade;
drop type if exists public.verification_status cascade;
drop type if exists public.compartment_status cascade;
drop type if exists public.notification_type cascade;

-- ════════════════════════════════════════════════════════════════════
-- Done. public schema is now empty. Next: run supabase_setup.sql.
-- ════════════════════════════════════════════════════════════════════

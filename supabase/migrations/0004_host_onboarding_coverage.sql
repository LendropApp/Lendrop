-- 0004_host_onboarding_coverage.sql
-- Adds storage for the "coverage" step of the host onboarding wizard:
-- which existing lockers (from public.lockers) the host can reach to
-- drop off items. Kept as a plain uuid[] rather than a join table since
-- onboarding is a single draft row per user, not a queryable relation.

alter table host_onboarding
  add column if not exists preferred_locker_ids uuid[] not null default '{}';

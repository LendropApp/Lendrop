-- 0016_price_suggestions_cache.sql
-- Fase 7: cache for AI/comparable-based price suggestions
-- (supabase/functions/suggest-price). Service-role-only — the Edge
-- Function is the only thing that ever reads or writes this table, so
-- RLS is enabled with zero policies (deny-all for authenticated/anon).

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

alter table public.price_suggestions_cache enable row level security;
-- Intentionally no policies: only the service role (which bypasses RLS)
-- may read or write this table.

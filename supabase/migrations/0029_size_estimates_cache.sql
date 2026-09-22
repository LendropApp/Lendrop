-- 0029_size_estimates_cache.sql
-- Documents a migration already applied directly to the Supabase project
-- (name: size_estimates_cache, version 20260922001412).
-- Pulled verbatim from supabase_migrations.schema_migrations.

-- Caché de estimaciones de medidas por IA (misma idea que price_suggestions_cache).
-- Solo la escribe/lee la Edge Function estimate-item-size con service role.
create table if not exists public.size_estimates_cache (
  cache_key text primary key,              -- sha256(categoría:título:descripción normalizados)
  length_cm numeric(6,1) not null,
  width_cm  numeric(6,1) not null,
  height_cm numeric(6,1) not null,
  weight_kg numeric(6,2) not null,
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  packaging text,
  reasoning text,
  created_at timestamptz not null default now()
);
comment on table public.size_estimates_cache is
  'Caché de 30 días de medidas estimadas por IA. Sin policies a propósito: solo service role.';
alter table public.size_estimates_cache enable row level security;

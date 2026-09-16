-- 0006_payment_methods.sql
-- Fase 2: saved payment methods, backing src/pages/PaymentMethods.jsx
-- (currently wired to local mock state — this table is what it moves to
-- once card entry goes through a real Wompi tokenization call).
--
-- ── WHY NO RAW CARD NUMBER / CVC COLUMN ──────────────────────────────
-- This table never stores a full PAN or CVC. Per PLAN_MVP_70.md, card
-- entry goes through Wompi (client-side, using the public key) and Wompi
-- hands back an opaque token plus safe display fields (brand, last4,
-- expiry) — that's what gets persisted here. Storing raw card data
-- ourselves would put this project in PCI-DSS scope for no reason; the
-- whole point of the WompiProvider abstraction is that only Wompi ever
-- touches the real card.
-- ════════════════════════════════════════════════════════════════════

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'wompi',
  provider_token text not null, -- opaque tokenized reference from Wompi
  brand text,
  last4 text check (last4 is null or length(last4) = 4),
  expiry_month smallint check (expiry_month between 1 and 12),
  expiry_year smallint,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.payment_methods is 'Tokenized payment method references only (brand/last4/expiry for display) — never raw card numbers or CVC. The real card data lives with the payment provider (Wompi).';

create index payment_methods_user_idx on public.payment_methods(user_id);

-- Only one default card per user, enforced by the database instead of
-- trusting the client to unset the previous default first.
create unique index payment_methods_one_default_per_user
  on public.payment_methods(user_id) where (is_default);

alter table public.payment_methods enable row level security;

create policy "payment_methods_select_own" on public.payment_methods
  for select using (user_id = auth.uid());

create policy "payment_methods_insert_own" on public.payment_methods
  for insert with check (user_id = auth.uid());

create policy "payment_methods_update_own" on public.payment_methods
  for update using (user_id = auth.uid());

create policy "payment_methods_delete_own" on public.payment_methods
  for delete using (user_id = auth.uid());

-- Flipping a card to is_default = true auto-clears the previous default
-- in the same transaction, so the app can just update the one row it
-- means to change instead of doing a two-step unset/set dance.
create or replace function public.on_payment_method_set_default()
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
  before insert or update of is_default on public.payment_methods
  for each row execute function public.on_payment_method_set_default();

-- ════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN 0006
-- ════════════════════════════════════════════════════════════════════

-- 0025_wompi_mock_payment_flow.sql
-- Documents a migration already applied directly to the Supabase project
-- (name: wompi_mock_payment_flow, version 20260921225721). Pulled verbatim
-- from supabase_migrations.schema_migrations — not reconstructed.

-- =====================================================================
-- Wompi "pre-sandbox" (mock) payment flow
-- Contrato idéntico al que tendrá el sandbox/producción real:
--   create_checkout (cliente)  ->  pasarela  ->  apply_payment_result (webhook, backend)
-- Cambiar a Wompi real = nueva Edge Function de webhook que llama a
-- apply_payment_result. La base de datos no cambia.
-- =====================================================================

-- 1) Columnas de pago (nunca datos de tarjeta completos: solo marca y last4)
alter table public.payments
  add column if not exists environment text not null default 'mock'
    check (environment in ('mock', 'sandbox', 'production')),
  add column if not exists checkout_expires_at timestamptz,
  add column if not exists failure_reason text,
  add column if not exists card_brand text,
  add column if not exists card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists payments_provider_reference_uniq
  on public.payments (provider, provider_reference) where provider_reference is not null;
create index if not exists payments_pending_expiry_idx
  on public.payments (checkout_expires_at) where status = 'pending';

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- 2) Bitácora de eventos de la pasarela (auditoría + idempotencia)
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text not null,
  environment text not null,
  event_key text not null unique,          -- transaction_id:outcome -> idempotencia
  outcome text not null check (outcome in ('approved', 'declined', 'error', 'expired')),
  provider_transaction_id text,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);
comment on table public.payment_events is
  'Registro inmutable de cada evento de la pasarela (hoy mock, mañana webhook real de Wompi). Solo lo escribe el backend.';
alter table public.payment_events enable row level security;

drop policy if exists payment_events_select_admin on public.payment_events;
create policy payment_events_select_admin on public.payment_events
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

create index if not exists payment_events_payment_idx on public.payment_events (payment_id);

-- 3) create_checkout: lo llama el cliente al pulsar "Pagar"
create or replace function public.create_checkout(p_item_id uuid, p_start_date date, p_end_date date)
returns table (
  reservation_id uuid,
  payment_id uuid,
  amount numeric,
  currency text,
  rental_subtotal numeric,
  commission_amount numeric,
  protection_fee_amount numeric,
  damage_liability_amount numeric,
  expires_at timestamptz,
  environment text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item record;
  v_bd record;
  v_res_id uuid;
  v_pay_id uuid;
  v_expires timestamptz := now() + interval '15 minutes';
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  if not public.is_identity_verified(v_uid) then
    raise exception 'IDENTITY_NOT_VERIFIED' using errcode = '42501';
  end if;
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'INVALID_DATE_RANGE' using errcode = '22023';
  end if;
  if p_start_date < current_date then
    raise exception 'START_DATE_IN_PAST' using errcode = '22023';
  end if;

  select i.owner_id, i.price_per_day, i.declared_value, i.category_id, p.is_premium
    into v_item
  from public.items i
  join public.profiles p on p.id = i.owner_id
  where i.id = p_item_id and i.is_available;

  if v_item.price_per_day is null then
    raise exception 'ITEM_NOT_AVAILABLE' using errcode = 'P0002';
  end if;
  if v_item.owner_id = v_uid then
    raise exception 'CANNOT_RENT_OWN_ITEM' using errcode = '22023';
  end if;

  -- Idempotencia: si el usuario reintenta con un checkout vigente, se reutiliza
  select r.id, pay.id into v_res_id, v_pay_id
  from public.reservations r
  join public.payments pay on pay.reservation_id = r.id
  where r.item_id = p_item_id and r.renter_id = v_uid
    and r.start_date = p_start_date and r.end_date = p_end_date
    and r.status = 'pending' and pay.status = 'pending'
    and pay.checkout_expires_at > now()
  limit 1;

  select * into v_bd from public.calculate_pricing_breakdown(
    v_item.price_per_day, (p_end_date - p_start_date + 1),
    v_item.declared_value, v_item.category_id, v_item.is_premium);

  if v_res_id is null then
    begin
      insert into public.reservations (
        item_id, renter_id, start_date, end_date, status, total_price,
        protection_fee_amount, commission_amount, damage_liability_amount, damage_liability_cap_applied)
      values (
        p_item_id, v_uid, p_start_date, p_end_date, 'pending', v_bd.rental_subtotal,
        v_bd.protection_fee_amount, v_bd.commission_amount, v_bd.damage_liability_amount, v_bd.damage_liability_cap_applied)
      returning id into v_res_id;
    exception when exclusion_violation then
      raise exception 'DATES_UNAVAILABLE' using errcode = '23P01';
    end;

    insert into public.payments (reservation_id, amount, status, provider, environment, checkout_expires_at)
    values (v_res_id, v_bd.total_charged_today, 'pending', 'wompi', 'mock', v_expires)
    returning id into v_pay_id;
  else
    select pay.checkout_expires_at into v_expires from public.payments pay where pay.id = v_pay_id;
  end if;

  reservation_id := v_res_id;
  payment_id := v_pay_id;
  amount := v_bd.total_charged_today;
  currency := 'USD';
  rental_subtotal := v_bd.rental_subtotal;
  commission_amount := v_bd.commission_amount;
  protection_fee_amount := v_bd.protection_fee_amount;
  damage_liability_amount := v_bd.damage_liability_amount;
  expires_at := v_expires;
  environment := 'mock';
  return next;
end;
$$;

revoke execute on function public.create_checkout(uuid, date, date) from public, anon;
grant  execute on function public.create_checkout(uuid, date, date) to authenticated;

-- 4) apply_payment_result: el "webhook". SOLO backend (service_role).
create or replace function public.apply_payment_result(
  p_payment_id uuid,
  p_outcome text,
  p_transaction_id text,
  p_card_brand text default null,
  p_card_last4 text default null,
  p_failure_reason text default null,
  p_payload jsonb default '{}'::jsonb
)
returns table (payment_status public.payment_status, reservation_status public.reservation_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pay record;
  v_res record;
  v_inserted int;
begin
  if p_outcome not in ('approved', 'declined', 'error', 'expired') then
    raise exception 'INVALID_OUTCOME' using errcode = '22023';
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if v_pay.id is null then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  select * into v_res from public.reservations where id = v_pay.reservation_id for update;

  -- Idempotencia: el mismo evento dos veces no hace nada
  insert into public.payment_events (payment_id, provider, environment, event_key, outcome, provider_transaction_id, payload)
  values (v_pay.id, v_pay.provider, v_pay.environment,
          coalesce(p_transaction_id, gen_random_uuid()::text) || ':' || p_outcome,
          p_outcome, p_transaction_id, coalesce(p_payload, '{}'::jsonb))
  on conflict (event_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 or v_pay.status <> 'pending' then
    payment_status := v_pay.status;
    reservation_status := v_res.status;
    return next;
    return;
  end if;

  if p_outcome = 'approved' then
    if v_res.status <> 'pending' then
      -- Aprobación tardía (checkout ya vencido/cancelado): se reembolsa automáticamente
      update public.payments
        set status = 'refunded', provider_reference = p_transaction_id,
            card_brand = p_card_brand, card_last4 = p_card_last4,
            paid_at = now(), failure_reason = 'late_approval_auto_refund'
      where id = v_pay.id;
    else
      update public.payments
        set status = 'paid', paid_at = now(), provider_reference = p_transaction_id,
            card_brand = p_card_brand, card_last4 = p_card_last4, failure_reason = null
      where id = v_pay.id;

      insert into public.damage_holds (reservation_id, amount_held, status, provider)
      values (v_res.id, v_res.damage_liability_amount, 'held', 'simulated')
      on conflict (reservation_id) do nothing;

      -- Dispara asignación de locker + notificaciones (triggers existentes)
      update public.reservations set status = 'confirmed' where id = v_res.id;
    end if;
  else
    update public.payments
      set status = 'failed', provider_reference = coalesce(p_transaction_id, provider_reference),
          card_brand = p_card_brand, card_last4 = p_card_last4,
          failure_reason = coalesce(p_failure_reason, p_outcome)
    where id = v_pay.id;

    if v_res.status = 'pending' then
      update public.reservations set status = 'cancelled' where id = v_res.id;
    end if;

    if p_outcome <> 'expired' then
      insert into public.notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (v_res.renter_id, 'payment', 'Pago rechazado',
              'Tu pago no se completó. Puedes intentarlo de nuevo con otra tarjeta.',
              v_res.id, false, now());
    end if;
  end if;

  select p.status, r.status into payment_status, reservation_status
  from public.payments p join public.reservations r on r.id = p.reservation_id
  where p.id = v_pay.id;
  return next;
end;
$$;

revoke execute on function public.apply_payment_result(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant  execute on function public.apply_payment_result(uuid, text, text, text, text, text, jsonb) to service_role;

-- 5) Cancelación -> reembolso simulado + liberar depósito
create or replace function public.on_reservation_cancelled_settle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.payments set status = 'refunded', failure_reason = coalesce(failure_reason, 'reservation_cancelled')
      where reservation_id = new.id and status in ('paid', 'authorized');
    update public.payments set status = 'failed', failure_reason = coalesce(failure_reason, 'reservation_cancelled')
      where reservation_id = new.id and status = 'pending';
    update public.damage_holds set status = 'cancelled', released_at = now()
      where reservation_id = new.id and status = 'held';
  end if;
  return new;
end;
$$;
revoke execute on function public.on_reservation_cancelled_settle() from public, anon, authenticated;

drop trigger if exists settle_payment_after_cancel on public.reservations;
create trigger settle_payment_after_cancel
  after update of status on public.reservations
  for each row execute function public.on_reservation_cancelled_settle();

-- 6) Checkouts vencidos: liberan las fechas cada 5 minutos
create or replace function public.expire_stale_checkouts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count int := 0;
begin
  for v_row in
    select id from public.payments
    where status = 'pending' and checkout_expires_at is not null and checkout_expires_at < now()
    for update skip locked
  loop
    perform public.apply_payment_result(v_row.id, 'expired', 'expire:' || v_row.id::text,
                                        null, null, 'checkout_expired', '{}'::jsonb);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke execute on function public.expire_stale_checkouts() from public, anon, authenticated;
grant  execute on function public.expire_stale_checkouts() to service_role;

select cron.unschedule('expirar-checkouts') where exists (select 1 from cron.job where jobname = 'expirar-checkouts');
select cron.schedule('expirar-checkouts', '*/5 * * * *', 'select public.expire_stale_checkouts();');

-- 7) Datos existentes: marcar pagos previos como mock
update public.payments set environment = 'mock' where provider = 'simulated';

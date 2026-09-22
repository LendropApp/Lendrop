-- 0024_security_hardening_rpc_and_reservation_guard.sql
-- Documents a migration already applied directly to the Supabase project
-- (name: security_hardening_rpc_and_reservation_guard, version
-- 20260921225634) ahead of the Wompi mock checkout flow. Pulled verbatim
-- from supabase_migrations.schema_migrations — not reconstructed.
--
-- Superseded in part by 0026_fix_reservation_guard_effective_role.sql,
-- which replaces guard_reservation_client_update() below with a version
-- that checks the effective Postgres role (current_user) instead of the
-- JWT-claimed role (auth.role()) — the original version here blocked
-- legitimate writes from trusted SECURITY DEFINER functions. Kept as
-- its own file, in original form, to preserve the real history.

-- =====================================================================
-- Security hardening
-- 1) Nadie llama por RPC a funciones de trigger ni a funciones de dinero.
-- 2) Funciones de usuario: solo authenticated (no anon).
-- 3) search_path fijo en funciones que lo tenían mutable.
-- 4) Guard: el cliente solo puede CANCELAR una reserva; cualquier otro
--    cambio de estado/montos lo hace el backend (service_role).
-- =====================================================================

-- 1) Funciones de trigger / internas: sin EXECUTE para clientes
revoke execute on function public.assign_compartment_on_confirm()              from public, anon, authenticated;
revoke execute on function public.release_compartment_on_cancel()              from public, anon, authenticated;
revoke execute on function public.release_compartment_on_reservation_delete()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()                            from public, anon, authenticated;
revoke execute on function public.notify_new_item_review()                     from public, anon, authenticated;
revoke execute on function public.notify_new_message()                         from public, anon, authenticated;
revoke execute on function public.notify_new_review()                          from public, anon, authenticated;
revoke execute on function public.notify_reservation_status_change()           from public, anon, authenticated;
revoke execute on function public.on_item_review_change()                      from public, anon, authenticated;
revoke execute on function public.sync_verification_status()                   from public, anon, authenticated;
revoke execute on function public.update_profile_rating()                      from public, anon, authenticated;
revoke execute on function public.refresh_owner_rating(uuid)                   from public, anon, authenticated;

-- Dinero: solo backend. Liberar depósito ya lo hace locker-access (service_role)
-- en una devolución limpia; capturar requiere revisión de disputa (admin/backend).
revoke execute on function public.release_damage_hold(uuid)                    from public, anon, authenticated;
revoke execute on function public.capture_damage_hold(uuid, numeric, uuid)     from public, anon, authenticated;

-- 2) Funciones de usuario: requieren sesión
revoke execute on function public.create_simulated_reservation(uuid, date, date) from public, anon;
revoke execute on function public.create_pending_reservation(uuid, date, date)   from public, anon;
revoke execute on function public.start_conversation(uuid, uuid, uuid)           from public, anon;
revoke execute on function public.is_identity_verified(uuid)                     from public, anon;
grant  execute on function public.is_identity_verified(uuid)                     to authenticated;
-- get_item_booked_ranges / get_currently_rented_item_ids quedan públicas a
-- propósito: solo exponen fechas ocupadas e ids, necesarias para Explore sin login.

-- 3) search_path fijo
alter function public.protect_verification_status()   set search_path = public;
alter function public.prevent_self_admin_promotion()  set search_path = public;
alter function public.set_updated_at()                set search_path = public;
alter function public.send_return_reminders()         set search_path = public;
alter function public.freeze_item_original_price()    set search_path = public;

-- 4) Guard de transiciones de reserva
create or replace function public.guard_reservation_client_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text := coalesce(auth.role(), '');
begin
  -- Backend (service_role) y migraciones (postgres) pasan sin restricción
  if v_role not in ('authenticated', 'anon') then
    return new;
  end if;

  -- El cliente nunca toca montos, fechas, locker ni flags
  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'RESERVATION_FIELDS_READ_ONLY' using errcode = '42501',
      hint = 'Solo el backend puede modificar montos, fechas o locker.';
  end if;

  if new.status is distinct from old.status then
    -- Única transición permitida desde el cliente: cancelar antes de que
    -- el artículo entre al locker.
    if new.status <> 'cancelled' or old.status not in ('pending', 'confirmed') then
      raise exception 'INVALID_STATUS_TRANSITION' using errcode = '42501',
        hint = format('%s -> %s solo lo puede hacer el backend.', old.status, new.status);
    end if;
    if exists (select 1 from public.locker_events e where e.reservation_id = old.id) then
      raise exception 'CANNOT_CANCEL_AFTER_DROPOFF' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_reservation_client_update() from public, anon, authenticated;

drop trigger if exists guard_reservation_client_update on public.reservations;
create trigger guard_reservation_client_update
  before update on public.reservations
  for each row execute function public.guard_reservation_client_update();

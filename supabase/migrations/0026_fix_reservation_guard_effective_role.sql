-- 0026_fix_reservation_guard_effective_role.sql
-- Documents a migration already applied directly to the Supabase project
-- (name: fix_reservation_guard_effective_role, version 20260921225832).
-- Pulled verbatim from supabase_migrations.schema_migrations — not
-- reconstructed.

-- El guard debe mirar el rol EFECTIVO (current_user), no el claim del JWT:
-- dentro de funciones SECURITY DEFINER de confianza (triggers de locker,
-- apply_payment_result) current_user es el dueño de la función, y deben pasar.
-- Un UPDATE directo desde el cliente vía PostgREST corre como 'authenticated'.
create or replace function public.guard_reservation_client_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at') is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'RESERVATION_FIELDS_READ_ONLY' using errcode = '42501',
      hint = 'Solo el backend puede modificar montos, fechas o locker.';
  end if;

  if new.status is distinct from old.status then
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

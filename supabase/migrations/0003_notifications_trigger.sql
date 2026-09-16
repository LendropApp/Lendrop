-- Migración: Notificaciones automáticas de reservas
-- Tarea 1 — feat/notifications
-- Cubre: reserva confirmada, recordatorio antes de devolución, depósito liberado

-- 1. Trigger para cambios de estado (confirmada / completada)
create or replace function notify_reservation_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status then

    if new.status = 'confirmed' then
      insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (
        new.renter_id,
        'reservation',
        'Reserva confirmada',
        'Tu reserva ha sido confirmada. Del ' || new.start_date || ' al ' || new.end_date || '.',
        new.id,
        false,
        now()
      );

    elsif new.status = 'completed' then
      insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (
        new.renter_id,
        'reservation',
        'Depósito liberado',
        'Tu depósito ha sido liberado. La reserva se completó correctamente.',
        new.id,
        false,
        now()
      );

    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_notify_reservation_status on reservations;
create trigger trg_notify_reservation_status
after update on reservations
for each row
execute function notify_reservation_status_change();


-- 2. Función + cron job para el recordatorio de devolución
-- Requiere la extensión pg_cron habilitada (Database > Extensions en Supabase)

create or replace function send_return_reminders()
returns void as $$
begin
  insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
  select
    r.renter_id,
    'reservation',
    'Recordatorio de devolución',
    'Recuerda devolver el artículo antes del ' || r.end_date || '.',
    r.id,
    false,
    now()
  from reservations r
  where r.status = 'active'
    and r.end_date = current_date + 1
    and not exists (
      select 1 from notifications n
      where n.related_id = r.id
        and n.title = 'Recordatorio de devolución'
    );
end;
$$ language plpgsql;

select cron.schedule(
  'recordatorio-devolucion-diario',
  '0 9 * * *',
  $$select send_return_reminders();$$
);

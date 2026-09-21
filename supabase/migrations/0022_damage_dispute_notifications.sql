-- 0022_damage_dispute_notifications.sql
-- Fase 10: return_pickup can now flag damage and move a reservation to
-- 'disputed' (see the locker-access Edge Function) instead of
-- 'completed'. notify_reservation_status_change() (0003/0008/0021)
-- didn't know about that transition yet -- add it so both parties hear
-- that the deposit is being held pending review, not just silently see
-- an "In dispute" badge next time they open Activity.

create or replace function notify_reservation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item_owner uuid;
  item_title text;
begin
  if new.status is distinct from old.status then
    select owner_id, title into item_owner, item_title from public.items where id = new.item_id;

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

      if item_owner is not null and item_owner is distinct from new.renter_id then
        insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
        values (
          item_owner,
          'reservation',
          'Nueva reserva confirmada',
          coalesce(item_title, 'Tu artículo') || ' fue reservado del ' || new.start_date || ' al ' || new.end_date || '.',
          new.id,
          false,
          now()
        );
      end if;

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

      if item_owner is not null and item_owner is distinct from new.renter_id then
        insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
        values (
          item_owner,
          'reservation',
          'Devolución confirmada',
          coalesce(item_title, 'Tu artículo') || ' fue devuelto y la reserva se completó correctamente.',
          new.id,
          false,
          now()
        );
      end if;

    elsif new.status = 'disputed' then
      insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
      values (
        new.renter_id,
        'dispute',
        'Daño reportado en tu alquiler',
        'El lender reportó daño al recibir la devolución. Tu depósito queda retenido mientras se revisa.',
        new.id,
        false,
        now()
      );

      if item_owner is not null and item_owner is distinct from new.renter_id then
        insert into notifications (user_id, type, title, body, related_id, is_read, created_at)
        values (
          item_owner,
          'dispute',
          'Reporte de daño enviado',
          'Tu reporte de daño quedó registrado. El depósito permanece retenido mientras se revisa.',
          new.id,
          false,
          now()
        );
      end if;

    end if;
  end if;
  return new;
end;
$$;

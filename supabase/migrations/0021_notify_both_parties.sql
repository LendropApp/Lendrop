-- 0021_notify_both_parties.sql
-- Fase 9: reservation confirmation and return confirmation must notify
-- BOTH parties. notify_reservation_status_change() (0003, security-
-- definer'd in 0008) only ever inserted a notification for
-- new.renter_id -- the lender never heard about either event. The
-- return-reminder cron (send_return_reminders, already scheduled and
-- active) stays renter-only on purpose: it's the renter who physically
-- has the item to bring back, not the lender.
--
-- No app code changes needed: Notifications.jsx and the Explore unread
-- badge already query public.notifications generically by user_id and
-- type, so a new row here shows up for the lender the same way it
-- already does for the renter.

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

    end if;
  end if;
  return new;
end;
$$;

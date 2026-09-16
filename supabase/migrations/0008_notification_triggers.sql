-- 0008_notification_triggers.sql
-- Fase 2: makes the notification bell in Explore actually produce
-- notifications for the two things that are real in the app today —
-- receiving a message, and getting a comment/rating on your listing.
--
-- ── WHY SECURITY DEFINER HERE ─────────────────────────────────────────
-- public.notifications only has notifications_select_own and
-- notifications_update_own policies (see supabase_setup.sql) — there is
-- no INSERT policy for "authenticated", on purpose: a user should never
-- be able to write themselves (or worse, someone else) an arbitrary
-- notification row. That means any trigger that inserts a notification
-- FOR SOMEONE ELSE (the message recipient, the item owner) must run
-- with elevated privileges, same as start_conversation() in migration
-- 0007 and handle_new_user() in the base schema.
--
-- NOTE: this also fixes notify_reservation_status_change() from
-- migration 0003_notifications_trigger.sql, which inserts into
-- notifications for new.renter_id without SECURITY DEFINER. That's
-- latent today (nothing updates reservations.status from the client
-- yet — Fase 3/4), but the moment a renter's own reservation update
-- fires that trigger, it would hit the same missing-INSERT-policy wall
-- and roll back the whole update. Recreated below with the same
-- security definer + search_path pattern as everything else here.
-- ════════════════════════════════════════════════════════════════════

create or replace function notify_reservation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- ── New message → notify every OTHER participant in the conversation ──
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_name text;
  recipient uuid;
begin
  select full_name into sender_name from public.profiles where id = new.sender_id;

  for recipient in
    select cp.user_id
    from public.conversation_participants cp
    where cp.conversation_id = new.conversation_id
      and cp.user_id <> new.sender_id
  loop
    insert into public.notifications (user_id, type, title, body, related_id)
    values (
      recipient,
      'message',
      coalesce(sender_name, 'Lendrop user') || ' sent you a message',
      left(new.body, 140),
      new.conversation_id
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- ── New item review → notify the item's owner ──────────────────────────
create or replace function public.notify_new_item_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner uuid;
  reviewer_name text;
  item_title text;
begin
  select i.owner_id, i.title into owner, item_title from public.items i where i.id = new.item_id;
  if owner is null or owner = new.reviewer_id then
    return new;
  end if;

  select full_name into reviewer_name from public.profiles where id = new.reviewer_id;

  insert into public.notifications (user_id, type, title, body, related_id)
  values (
    owner,
    'review',
    coalesce(reviewer_name, 'Someone') || ' reviewed ' || coalesce(item_title, 'your listing'),
    new.comment,
    new.item_id
  );

  return new;
end;
$$;

drop trigger if exists on_item_review_created on public.item_reviews;
create trigger on_item_review_created
  after insert on public.item_reviews
  for each row execute function public.notify_new_item_review();

-- ════════════════════════════════════════════════════════════════════
-- FIN DE LA MIGRACIÓN 0008
-- ════════════════════════════════════════════════════════════════════

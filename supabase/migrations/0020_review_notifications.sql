-- 0020_review_notifications.sql
-- Fase 8: the reservation-gated public.reviews table (renter <-> lender,
-- see 0018's comment) has existed since 0005 but nothing ever wrote to
-- it from the frontend, so it never got a notification trigger either.
-- item_reviews already notifies the item's owner on a new review
-- (0008's notify_new_item_review) — this mirrors that for the reviews
-- table, notifying the reviewee (whichever party didn't write it).

-- ── Tighten reviews_insert_participant ──────────────────────────────
-- The original policy (supabase_setup.sql) only checked that the caller
-- was A participant on A completed reservation — it never checked that
-- reviewee_id was actually the OTHER party on THAT reservation. Since
-- this is the first migration to make the table reachable from the
-- frontend, fix it here before any real writes happen: a participant
-- could otherwise name any profile (including their own) as the
-- reviewee and skew their public rating.
drop policy if exists "reviews_insert_participant" on public.reviews;
create policy "reviews_insert_participant" on public.reviews
  for insert with check (
    reviewer_id = auth.uid()
    and reviewee_id <> auth.uid()
    and exists (
      select 1 from public.reservations r
      join public.items i on i.id = r.item_id
      where r.id = reservation_id
        and r.status = 'completed'
        and (
          (r.renter_id = auth.uid() and reviewee_id = i.owner_id)
          or (i.owner_id = auth.uid() and reviewee_id = r.renter_id)
        )
    )
  );

create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reviewer_name text;
begin
  select full_name into reviewer_name from public.profiles where id = new.reviewer_id;

  insert into public.notifications (user_id, type, title, body, related_id)
  values (
    new.reviewee_id,
    'review',
    coalesce(reviewer_name, 'Someone') || ' left you a review',
    new.comment,
    new.reservation_id
  );

  return new;
end;
$$;

drop trigger if exists on_review_created_notify on public.reviews;
create trigger on_review_created_notify
  after insert on public.reviews
  for each row execute function public.notify_new_review();

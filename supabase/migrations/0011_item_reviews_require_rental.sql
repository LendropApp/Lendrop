-- 0011_item_reviews_require_rental.sql
-- Restrict item_reviews so only someone who has actually rented the item
-- can leave a comment/rating on it (previously any logged-in non-owner
-- could review any item, sight unseen).
--
-- "Rented" = has a reservation on this item that got past the booking
-- step (confirmed/active/completed) — not merely pending or cancelled.

drop policy if exists "item_reviews_insert_own" on public.item_reviews;

create policy "item_reviews_insert_own" on public.item_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and not exists (
      select 1 from public.items i where i.id = item_id and i.owner_id = auth.uid()
    )
    and exists (
      select 1 from public.reservations r
      where r.item_id = item_reviews.item_id
        and r.renter_id = auth.uid()
        and r.status in ('confirmed', 'active', 'completed')
    )
  );

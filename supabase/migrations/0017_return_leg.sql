-- 0017_return_leg.sql
-- Fase 8 prerequisite: the rental lifecycle stopped at "renter picked
-- up the item" — nothing ever marked a reservation 'completed', so the
-- reviews table's RLS (which requires status = 'completed') could
-- never be satisfied. Adds the return leg: renter drops the item back
-- at the locker, lender confirms receipt, which finalizes the
-- reservation and auto-releases the damage-liability hold.
--
-- Two new locker_events types instead of reusing item_deposited/
-- item_retrieved a second time — keeps "has this been returned yet"
-- a plain existence check instead of counting rows by actor.

alter table public.locker_events drop constraint locker_events_event_type_check;
alter table public.locker_events add constraint locker_events_event_type_check
  check (event_type in ('opened', 'closed', 'item_deposited', 'item_retrieved', 'return_deposited', 'return_retrieved'));

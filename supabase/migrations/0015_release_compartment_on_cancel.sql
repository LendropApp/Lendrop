-- 0015_release_compartment_on_cancel.sql
-- Fixes a gap found while testing Fase 6: nothing released a
-- locker_compartments row back to 'available' when its reservation
-- was cancelled or removed, so it stayed stuck as reserved/occupied
-- forever and could never be assigned to another booking.

create or replace function public.release_compartment_on_cancel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'cancelled' and new.compartment_id is not null then
    update public.locker_compartments
    set status = 'available'
    where id = new.compartment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists release_compartment_after_cancel on public.reservations;
create trigger release_compartment_after_cancel
  after update of status on public.reservations
  for each row execute function public.release_compartment_on_cancel();

-- Defense in depth: nothing in the app deletes a reservation row today
-- (History.jsx only ever updates status to 'cancelled'), but release
-- the compartment here too in case that ever changes.
create or replace function public.release_compartment_on_reservation_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.compartment_id is not null then
    update public.locker_compartments
    set status = 'available'
    where id = old.compartment_id;
  end if;
  return old;
end;
$$;

drop trigger if exists release_compartment_after_delete on public.reservations;
create trigger release_compartment_after_delete
  after delete on public.reservations
  for each row execute function public.release_compartment_on_reservation_delete();

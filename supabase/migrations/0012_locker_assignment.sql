-- 0012_locker_assignment.sql
-- Fase 5: seed a small locker network and auto-assign a compartment the
-- moment a reservation is confirmed. Actual pickup/drop-off events are
-- logged by the locker-access Edge Function (service role only — see
-- the existing comment on locker_events), never inserted by the client.

-- Locations are placeholders (no real locker sites decided yet) — swap
-- these for the real network once it exists.
alter table public.lockers add constraint lockers_name_key unique (name);

insert into public.lockers (name, address, city)
values
  ('Lendrop Locker — Metrocentro', 'Metrocentro San Salvador, Local 1', 'San Salvador'),
  ('Lendrop Locker — Multiplaza', 'Multiplaza, Nivel 1', 'San Salvador'),
  ('Lendrop Locker — La Gran Vía', 'La Gran Vía, Antiguo Cuscatlán', 'Antiguo Cuscatlán')
on conflict (name) do nothing;

insert into public.locker_compartments (locker_id, compartment_code, size)
select l.id, c.code, c.size
from public.lockers l
join (
  values
    ('Lendrop Locker — Metrocentro', 'A1', 'small'),
    ('Lendrop Locker — Metrocentro', 'A2', 'medium'),
    ('Lendrop Locker — Metrocentro', 'A3', 'medium'),
    ('Lendrop Locker — Metrocentro', 'A4', 'large'),
    ('Lendrop Locker — Multiplaza', 'B1', 'small'),
    ('Lendrop Locker — Multiplaza', 'B2', 'medium'),
    ('Lendrop Locker — Multiplaza', 'B3', 'large'),
    ('Lendrop Locker — La Gran Vía', 'C1', 'small'),
    ('Lendrop Locker — La Gran Vía', 'C2', 'medium'),
    ('Lendrop Locker — La Gran Vía', 'C3', 'large')
) as c(locker_name, code, size) on c.locker_name = l.name
on conflict (locker_id, compartment_code) do nothing;

-- Auto-assigns an available compartment (preferring one in the item's
-- city) the moment a reservation lands in 'confirmed'. security definer
-- because only the service role can normally write locker_compartments/
-- reservations.compartment_id — the renter who owns the reservation row
-- otherwise has no RLS grant to touch either.
create or replace function public.assign_compartment_on_confirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_id uuid;
  item_city text;
begin
  if new.status <> 'confirmed' or new.compartment_id is not null then
    return new;
  end if;

  select location_city into item_city from public.items where id = new.item_id;

  select c.id into chosen_id
  from public.locker_compartments c
  join public.lockers l on l.id = c.locker_id
  where c.status = 'available'
  order by (l.city = item_city) desc, random()
  limit 1
  for update of c skip locked;

  if chosen_id is not null then
    update public.locker_compartments set status = 'reserved' where id = chosen_id;
    update public.reservations set compartment_id = chosen_id where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_compartment_after_confirm on public.reservations;
create trigger assign_compartment_after_confirm
  after insert or update of status on public.reservations
  for each row execute function public.assign_compartment_on_confirm();

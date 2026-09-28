-- 0031_category_max_item_length.sql
-- Per-category cap on an item's longest packed side. Used for Bicycles:
-- only small bikes (kids' and folding bikes) can be listed. A full-size
-- bike technically fits the XL compartment, but it's not what Lendrop
-- lockers are for.
--
-- Límite por categoría del lado más largo del artículo empacado. Se usa
-- en Bicicletas: solo bicicletas pequeñas (de niño o plegables). Una
-- bicicleta de adulto cabe en el XL, pero no es para lo que sirven los
-- lockers de Lendrop.

alter table public.categories
  add column if not exists max_item_length_cm numeric(6,1)
    check (max_item_length_cm is null or max_item_length_cm > 0);

comment on column public.categories.max_item_length_cm is
  'Max longest packed side (cm) for items in this category. NULL = only the locker sizes limit it.';

-- Bicicletas: máx. 100 cm y sin tamaño por defecto, así que el dueño
-- tiene que dar medidas reales antes de que se pueda rentar.
update public.categories
set max_item_length_cm = 100, default_locker_size = null
where slug = 'bicycles';

create or replace function public.set_item_required_locker_size()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_max_length numeric;
begin
  if new.length_cm is not null then
    select c.max_item_length_cm into v_max_length
    from public.categories c where c.id = new.category_id;

    if v_max_length is not null
       and greatest(new.length_cm, new.width_cm, new.height_cm) > v_max_length then
      new.required_locker_size := null;  -- demasiado grande para su categoría
    else
      new.required_locker_size := public.compute_required_locker_size(new.length_cm, new.width_cm, new.height_cm, new.weight_kg);
    end if;
    new.dimensions_source := 'owner';
  else
    select c.default_locker_size into new.required_locker_size
    from public.categories c where c.id = new.category_id;
    new.dimensions_source := 'category_default';
  end if;
  return new;
end;
$$;
revoke execute on function public.set_item_required_locker_size() from public, anon, authenticated;

-- Recalcular bicicletas existentes (el trigger corre en el update)
update public.items i
set length_cm = i.length_cm
from public.categories c
where c.id = i.category_id and c.slug = 'bicycles';

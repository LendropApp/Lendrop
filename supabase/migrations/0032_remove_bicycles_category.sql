-- 0032_remove_bicycles_category.sql
-- Bicycles are no longer a Lendrop category. Removed only if nothing is
-- listed under it (items.category_id has no ON DELETE action, so a
-- listed bike would make the delete fail rather than orphan the item).
-- categories.max_item_length_cm (0031) stays as a generic per-category cap.
--
-- Las bicicletas dejan de ser una categoría de Lendrop. Se borra solo si
-- no hay artículos en ella. max_item_length_cm (0031) se mantiene como
-- límite genérico por categoría.

delete from public.categories c
where c.slug = 'bicycles'
  and not exists (select 1 from public.items i where i.category_id = c.id);

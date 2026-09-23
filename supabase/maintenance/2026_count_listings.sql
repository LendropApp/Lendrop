-- ─────────────────────────────────────────────────────────────────────────
-- 2026_count_listings.sql — SOLO LECTURA / READ ONLY
-- ─────────────────────────────────────────────────────────────────────────
-- Cuenta cuántas filas hay en cada tabla que el purgado tocaría, para saber
-- de antemano qué se va a borrar. No modifica nada: se puede correr las
-- veces que haga falta, antes y después de 2026_purge_listings.sql.
--
-- Counts every row the purge would delete. Read only — safe to run before
-- and after the purge to compare.
--
-- Las filas van en el MISMO orden en que el purgado borra (hijas → padre).
-- ─────────────────────────────────────────────────────────────────────────

select '01. payment_events'            as tabla, count(*) as filas from public.payment_events
union all select '02. payments',                 count(*) from public.payments
union all select '03. photo_evidence',           count(*) from public.photo_evidence
union all select '04. locker_events',            count(*) from public.locker_events
union all select '05. disputes',                 count(*) from public.disputes
union all select '06. damage_holds',             count(*) from public.damage_holds
union all select '07. compartment_bookings',     count(*) from public.compartment_bookings
union all select '08. reviews',                  count(*) from public.reviews
union all select '09. messages',                 count(*) from public.messages
union all select '10. conversation_participants', count(*) from public.conversation_participants
union all select '11. conversations',            count(*) from public.conversations
union all select '12. reservations',             count(*) from public.reservations
union all select '13. item_photos',              count(*) from public.item_photos
union all select '14. item_reviews',             count(*) from public.item_reviews
union all select '15. favorites',                count(*) from public.favorites
union all select '16. items',                    count(*) from public.items
order by tabla;


-- ─────────────────────────────────────────────────────────────────────────
-- Lo que NO se toca, para confirmar que sigue intacto después del purgado.
-- What the purge must NOT touch — run before and after; the numbers must match.
-- ─────────────────────────────────────────────────────────────────────────
select 'profiles'             as tabla, count(*) as filas from public.profiles
union all select 'profile_private',      count(*) from public.profile_private
union all select 'host_onboarding',      count(*) from public.host_onboarding
union all select 'identity_verifications', count(*) from public.identity_verifications
union all select 'categories',           count(*) from public.categories
union all select 'lockers',              count(*) from public.lockers
union all select 'locker_compartments',  count(*) from public.locker_compartments
union all select 'payment_methods',      count(*) from public.payment_methods
union all select 'user_preferences',     count(*) from public.user_preferences
order by tabla;


-- ─────────────────────────────────────────────────────────────────────────
-- Notificaciones que quedarían colgando. `notifications.related_id` es un
-- uuid SIN foreign key, así que nada las borra en cascada: apuntan a
-- reservas y artículos que ya no existirán.
--
-- notifications.related_id is a plain uuid with NO foreign key, so nothing
-- cascades it. These rows would survive the purge pointing at nothing.
-- ─────────────────────────────────────────────────────────────────────────
select
  n.type::text                as tipo,
  count(*)                    as filas
from public.notifications n
where n.related_id in (select id from public.reservations)
   or n.related_id in (select id from public.items)
group by n.type
order by n.type;


-- ─────────────────────────────────────────────────────────────────────────
-- Objetos en Storage, por bucket. Solo 'item-photos' entra en el purgado.
-- Storage objects per bucket. Only 'item-photos' is in scope.
-- ─────────────────────────────────────────────────────────────────────────
select
  bucket_id,
  count(*)                                   as objetos,
  pg_size_pretty(sum((metadata->>'size')::bigint)) as peso
from storage.objects
group by bucket_id
order by bucket_id;


-- ─────────────────────────────────────────────────────────────────────────
-- Cuántas fotos son archivos reales del bucket y cuántas son URLs externas.
-- Las publicaciones de demo guardan una URL completa en storage_path (ver
-- src/lib/photos.js), así que esas NO tienen ningún archivo que borrar.
--
-- Demo listings store a full external URL in item_photos.storage_path
-- instead of a bucket path, so they have no file to delete.
-- ─────────────────────────────────────────────────────────────────────────
select
  case
    when storage_path ~* '^https?://' then 'URL externa (sin archivo)'
    else 'ruta en bucket item-photos'
  end                as tipo_de_foto,
  count(*)           as filas
from public.item_photos
group by 1
order by 1;

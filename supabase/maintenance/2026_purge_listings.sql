-- ─────────────────────────────────────────────────────────────────────────
-- 2026_purge_listings.sql
-- ─────────────────────────────────────────────────────────────────────────
-- QUÉ HACE: borra TODAS las publicaciones (`items`) y todo lo que cuelga de
-- ellas — fotos, reservas, pagos, evidencias, eventos de locker, disputas,
-- reseñas, favoritos y conversaciones.
--
-- QUÉ NO TOCA: usuarios (`auth.users`), `profiles`, `profile_private`,
-- `host_onboarding`, `identity_verifications`, `categories`, `lockers`,
-- `locker_compartments`, `payment_methods` ni `user_preferences`.
--
-- ⚠️  ES IRREVERSIBLE. Haz un backup ANTES de correrlo:
--     Dashboard → Database → Backups, o
--     pg_dump "$DATABASE_URL" > backup_pre_purge.sql
--
-- ⚠️  Corre primero 2026_count_listings.sql para ver qué se va a borrar.
--
-- IRREVERSIBLE. Take a backup first. Run the count script first.
--
-- CÓMO CORRERLO: pega el archivo entero en el SQL Editor del dashboard y
-- ejecútalo de una sola vez. Todo va dentro de una transacción: si algo
-- falla, no se borra nada.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POR QUÉ ESTE ORDEN Y POR QUÉ NO `TRUNCATE ... CASCADE`
-- ─────────────────────────────────────────────────────────────────────────
-- Las foreign keys hacia `items` y `reservations` NO son todas cascada. Las
-- que no tienen regla de borrado abortan la operación si quedan hijas:
--
--   reservations.item_id      → items            SIN on delete  ← bloquea
--   conversations.item_id     → items            SIN on delete  ← bloquea
--   payments.reservation_id   → reservations     SIN on delete  ← bloquea
--   photo_evidence.reservation_id → reservations SIN on delete  ← bloquea
--   locker_events.reservation_id  → reservations SIN on delete  ← bloquea
--   disputes.reservation_id   → reservations     SIN on delete  ← bloquea
--
-- Por eso se borra de hijas a padre y de forma explícita. Varias tablas SÍ
-- son cascada (item_photos, item_reviews, favorites, damage_holds,
-- compartment_bookings, reviews, messages, conversation_participants,
-- payment_events) y se borrarían solas, pero se listan igual para que el
-- conteo final de 0 sea una verificación real y no una suposición.
--
-- `TRUNCATE ... CASCADE` NO se usa a propósito: TRUNCATE CASCADE arrastra
-- toda tabla que referencie a la truncada, siguiendo las FK sin importar su
-- regla de borrado, sin pasar por triggers de fila y sin forma de limitar el
-- alcance. Desde `items` eso alcanzaría `reservations` → `payments`,
-- `disputes`, `photo_evidence`, `locker_events`, `compartment_bookings`…
-- y desde ahí `conversations` → `messages`. Vaciaría las mismas tablas que
-- este script, pero sin control, sin poder excluir nada y sin disparar los
-- triggers que mantienen `profiles.average_rating` al día. El borrado es de
-- unas pocas miles de filas: no hace falta la velocidad de TRUNCATE.
-- ─────────────────────────────────────────────────────────────────────────

begin;

-- Nivel 1 ── lo que cuelga de `payments`
delete from public.payment_events;

-- Nivel 2 ── lo que cuelga de `reservations`
delete from public.payments;
delete from public.photo_evidence;
delete from public.locker_events;
delete from public.disputes;
delete from public.damage_holds;
delete from public.compartment_bookings;   -- libera los compartimentos; las
                                           -- puertas físicas (locker_compartments)
                                           -- NO se tocan
delete from public.reviews;                -- reseñas de la RESERVA

-- Nivel 3 ── conversaciones. Cuelgan de la reserva O del artículo, así que
-- hay que borrarlas explícitamente: una conversación abierta desde la ficha
-- de un artículo no tiene reservation_id y no la arrastraría nada.
delete from public.messages;
delete from public.conversation_participants;
delete from public.conversations;

-- Nivel 4 ── lo que cuelga de `items`
delete from public.reservations;
delete from public.item_photos;
delete from public.item_reviews;           -- reseñas del ARTÍCULO
delete from public.favorites;

-- Nivel 5 ── las publicaciones
delete from public.items;

-- Nivel 6 ── notificaciones huérfanas. `notifications.related_id` es un uuid
-- sin foreign key: nada la borra en cascada, así que estas filas quedarían
-- apuntando a reservas y artículos que ya no existen. Se borran solo los
-- tipos que nacen de una publicación o una reserva; 'system' se queda.
-- El enum completo es ('reservation','payment','message','review','dispute','system').
--
-- Si prefieres conservarlas, comenta este bloque: son inofensivas salvo que
-- la UI intente resolver el related_id.
delete from public.notifications
where type in ('reservation', 'payment', 'message', 'review', 'dispute');

-- Nivel 7 ── calificaciones acumuladas en `profiles`.
--
-- `refresh_owner_rating()` recalcula `average_rating` y `total_reviews`
-- sumando DOS fuentes: `reviews` (por reviewee_id) e `item_reviews` (unida a
-- items por owner_id). Pero los triggers que la llaman no cubren lo mismo:
--
--   on_item_review_change  → after insert OR UPDATE OR DELETE  ✔ recalcula
--   on_review_created      → after insert solamente            ✘ no recalcula
--
-- O sea: borrar `reviews` no dispara nada. Un perfil que solo tenía reseñas
-- en `reviews` y ninguna en `item_reviews` se quedaría con su nota vieja
-- apuntando a reseñas que ya no existen — justo el dato huérfano que este
-- purgado quiere evitar.
--
-- Como a esta altura AMBAS tablas están vacías, la nota de todo el mundo es
-- 0 por definición. Se escribe 0 y no null porque es lo que pone la propia
-- función (usa coalesce(..., 0)).
update public.profiles
set average_rating = 0,
    total_reviews  = 0
where average_rating is distinct from 0
   or total_reviews  is distinct from 0;

commit;


-- ─────────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN — todo debe dar 0
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
-- VERIFICACIÓN — esto debe seguir IGUAL que antes del purgado
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
-- VERIFICACIÓN — ningún perfil debe conservar nota: todo en 0
-- ─────────────────────────────────────────────────────────────────────────
select count(*) as perfiles_con_nota_colgando
from public.profiles
where average_rating is distinct from 0
   or total_reviews  is distinct from 0;

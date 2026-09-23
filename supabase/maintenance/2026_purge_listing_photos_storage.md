# Vaciar las fotos de artículos en Storage

Complemento de `2026_purge_listings.sql`. Hazlo **después** de correr el purgado
de la base de datos.

## Buckets del proyecto

| Bucket | Qué guarda | ¿Se vacía? |
|---|---|---|
| `item-photos` | Fotos de las publicaciones | **Sí** |
| `evidence-photos` | Fotos de depósito/retiro/devolución de una reserva | **Sí** |
| `avatars` | Fotos de perfil | **No** |
| `profile-avatars` | Fotos de perfil | **No** |
| `identity-documents` | DUI y selfies de verificación | **No, nunca** |

## Antes de borrar: buena parte puede no existir

`src/lib/photos.js` revela que las publicaciones de demo **no guardan un archivo**:
meten una URL externa completa en `item_photos.storage_path` y `getItemPhotoUrl()`
la usa tal cual. Solo las publicaciones creadas de verdad desde `/publish` tienen
un archivo en el bucket.

La última consulta de `2026_count_listings.sql` te dice el reparto exacto. Si casi
todo sale como *URL externa*, el bucket ya está prácticamente vacío y este paso
es trivial.

## Forma recomendada: el dashboard

**Storage → `item-photos` → seleccionar todo → Delete.**

Es la vía correcta porque borra **el archivo y su fila** a la vez.

## Alternativa por script (si son muchos archivos)

```js
// node scripts/purge-item-photos.mjs
// Necesita la SERVICE ROLE key: Project Settings → API → service_role.
// No la subas al repo ni la pongas en un archivo VITE_*.
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

let removed = 0
for (;;) {
  const { data, error } = await supabase.storage.from('item-photos').list('', { limit: 100 })
  if (error) throw error
  if (!data.length) break

  // list() devuelve carpetas y archivos mezclados; las carpetas no tienen id.
  const files = data.filter((f) => f.id).map((f) => f.name)
  if (!files.length) break

  const { error: rmError } = await supabase.storage.from('item-photos').remove(files)
  if (rmError) throw rmError
  removed += files.length
  console.log('borrados:', removed)
}
```

> Si las fotos están en subcarpetas por usuario (`{user_id}/archivo.jpg`), hay que
> recorrer cada carpeta: `list('')` solo devuelve el primer nivel.

## ⚠️ Por qué NO basta con SQL sobre `storage.objects`

Se puede hacer esto:

```sql
-- INCOMPLETO. Lee la advertencia de abajo antes de usarlo.
delete from storage.objects where bucket_id = 'item-photos';
```

…pero **solo borra el registro, no el archivo**. Supabase Storage guarda el binario
en S3 y usa `storage.objects` como índice. Al borrar únicamente la fila, el archivo
queda huérfano en el bucket: ya no aparece en el dashboard ni por la API, sigue
ocupando espacio y sigue facturando, y no hay forma de listarlo para limpiarlo
después.

Úsalo solo si ya vaciaste el bucket por el dashboard o por la API y quedaron filas
sueltas. Para consultar sin borrar:

```sql
select name, (metadata->>'size')::bigint as bytes, created_at
from storage.objects
where bucket_id = 'item-photos'
order by created_at desc;
```

## `evidence-photos`: también se vacía

**Decidido (Diego): se borra.**

`photo_evidence` desaparece con el purgado porque cuelga de `reservations`, así que
sus archivos quedarían huérfanos igual. Se vacía con el **mismo procedimiento** de
arriba, cambiando el bucket:

- Dashboard: **Storage → `evidence-photos` → seleccionar todo → Delete**.
- Script: la misma función, con `.from('evidence-photos')`.

Ojo: las fotos de evidencia suelen guardarse en subcarpetas por reserva
(`{reservation_id}/...`), así que por script hay que recorrer carpetas — `list('')`
solo devuelve el primer nivel. Por el dashboard no importa.

Después de vaciar ambos buckets, `2026_count_listings.sql` debe mostrar 0 objetos
en `item-photos` y en `evidence-photos`, y los conteos de `avatars`,
`profile-avatars` e `identity-documents` sin cambios.

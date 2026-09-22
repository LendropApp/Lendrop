// Item size / locker-fit estimation. The only place that calls
// estimate-item-size or reads locker_size_classes — no screen should
// query either directly.
import { supabase } from '../../lib/supabaseClient'
import { computeRequiredLockerSize } from './lockerFit'

export { computeRequiredLockerSize }

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Tu sesión expiró. Inicia sesión de nuevo.',
  TITLE_REQUIRED: 'Escribe el nombre del artículo para estimar su tamaño.',
  CATEGORY_REQUIRED: 'Elige una categoría antes de estimar el tamaño.',
  UNKNOWN_CATEGORY: 'Esa categoría no existe.',
}
const DEFAULT_MESSAGE = 'No se pudo estimar el tamaño. Intenta de nuevo.'

// functions.invoke() puts the real response on error.context (a Response
// object) instead of a parsed body — read it as JSON to get what the
// function actually returned.
async function normalizeFunctionError(error) {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()
      const code = body?.error ?? 'UNKNOWN'
      return { code, message: body?.message || ERROR_MESSAGES[code] || DEFAULT_MESSAGE }
    } catch {
      return { code: 'UNKNOWN', message: DEFAULT_MESSAGE }
    }
  }
  return { code: 'UNKNOWN', message: error?.message || DEFAULT_MESSAGE }
}

// Estimates the packed size/weight of an item from its category, title
// and description. The recommendation (fitsInLockers/recommendedSize) is
// always computed server-side from the same rule the DB trigger uses —
// never trust or recompute the fit decision itself on the client.
export async function estimateItemSize({ category, title, description }) {
  const { data, error } = await supabase.functions.invoke('estimate-item-size', {
    body: { category, title, description },
  })

  if (error) {
    throw await normalizeFunctionError(error)
  }

  return data
}

// locker_size_classes barely ever changes (it's a hardware catalog), so
// it's cached in memory for the life of the tab instead of re-querying
// every time a size gets computed client-side.
let cachedSizeClasses = null

export async function getLockerSizeClasses() {
  if (cachedSizeClasses) return cachedSizeClasses

  const { data, error } = await supabase
    .from('locker_size_classes')
    .select('code, label, rank, inner_height_cm, inner_width_cm, inner_depth_cm, max_weight_kg')
    .eq('is_active', true)
    .order('rank')

  if (error) throw { code: 'UNKNOWN', message: 'No se pudieron cargar los tamaños de locker.' }

  cachedSizeClasses = data ?? []
  return cachedSizeClasses
}

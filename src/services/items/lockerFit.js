// Pure client-side mirror of item_fits_size / compute_required_locker_size
// in supabase_setup.sql. Zero imports on purpose (no Supabase client) so
// it's usable both in the app and in a plain Node script for testing --
// the fit rule the client previews must stay in lockstep with the rule
// the database trigger actually enforces on save.
//
// Rule: sort each side's three measurements largest-to-smallest, compare
// pairwise (so the item can be rotated to fit), plus a weight check.

export function itemFitsSize(lengthCm, widthCm, heightCm, weightKg, sizeClass) {
  const item = [lengthCm, widthCm, heightCm].sort((a, b) => b - a)
  const box = [Number(sizeClass.inner_height_cm), Number(sizeClass.inner_width_cm), Number(sizeClass.inner_depth_cm)].sort(
    (a, b) => b - a
  )
  return (
    item[0] <= box[0] &&
    item[1] <= box[1] &&
    item[2] <= box[2] &&
    (Number(weightKg) || 0) <= Number(sizeClass.max_weight_kg)
  )
}

// Smallest size (by rank) the item fits in, or null if it fits none.
export function computeRequiredLockerSize(lengthCm, widthCm, heightCm, weightKg, sizeClasses) {
  const item = [Number(lengthCm), Number(widthCm), Number(heightCm)]
  if (item.some((n) => !Number.isFinite(n) || n <= 0)) return null

  const sorted = [...sizeClasses].sort((a, b) => a.rank - b.rank)
  for (const size of sorted) {
    if (itemFitsSize(item[0], item[1], item[2], weightKg, size)) return size
  }
  return null
}

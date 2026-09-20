import { supabase } from './supabaseClient'

// item_photos.storage_path is normally a path inside the 'item-photos'
// bucket, resolved via getPublicUrl. Demo/seed listings instead store a
// full external image URL there (no real product photo to upload) —
// detect that case and use it as-is instead of mangling it through the
// bucket resolver.
export function getItemPhotoUrl(storagePath) {
  if (!storagePath) return null
  if (/^https?:\/\//i.test(storagePath)) return storagePath
  return supabase.storage.from('item-photos').getPublicUrl(storagePath).data.publicUrl
}

import {
  Shirt,
  Wrench,
  Camera,
  Bot,
  Music,
  Bike,
  Dumbbell,
  Laptop,
  Tent,
  Luggage,
  Drama,
  Package,
} from 'lucide-react'

// `categories.icon` isn't populated, so slugs are mapped to an icon here
// instead — the single place both Explore and PublishItem read from, so the
// two can't drift the way the old hardcoded lists did. Slugs match the live
// `categories` table (English), not the Spanish seed in supabase_setup.sql —
// that file is stale relative to what's actually running.
export const ICONS_BY_SLUG = {
  clothing: Shirt,
  tools: Wrench,
  cameras: Camera,
  drones: Bot,
  'musical-instruments': Music,
  bicycles: Bike,
  'sports-equipment': Dumbbell,
  electronics: Laptop,
  'camping-equipment': Tent,
  suitcases: Luggage,
  costumes: Drama,
}

export function getCategoryIcon(slug) {
  return ICONS_BY_SLUG[slug] ?? Package
}

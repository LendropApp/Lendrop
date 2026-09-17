// A small pool of category-relevant photos for Explore's welcome banner.
// Which one shows rotates each time a user logs in (AuthContext calls
// rerollExploreHeroImage on the 'SIGNED_IN' auth event) instead of it
// always being the same hardcoded photo — persisted per-session so it
// doesn't jump around on every re-render or route change in between.
const HERO_SEED_KEY = 'lendrop_explore_hero_seed'

export const EXPLORE_HERO_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    alt: 'Camera ready for pickup',
  },
  {
    src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=800&q=80',
    alt: 'Drone ready for pickup',
  },
  {
    src: 'https://images.unsplash.com/photo-1508614999368-9260051292e5?auto=format&fit=crop&w=800&q=80',
    alt: 'Bicycle ready for pickup',
  },
  {
    src: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    alt: 'Camping gear ready for pickup',
  },
  {
    src: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80',
    alt: 'Power tool ready for pickup',
  },
]

function randomIndex() {
  return Math.floor(Math.random() * EXPLORE_HERO_IMAGES.length)
}

// Call once per login (AuthContext's 'SIGNED_IN' handler) to pick a new
// banner image for the session that's about to start.
export function rerollExploreHeroImage() {
  try {
    sessionStorage.setItem(HERO_SEED_KEY, String(randomIndex()))
  } catch {
    // sessionStorage can throw under some private-browsing policies —
    // the banner just keeps whatever it already had.
  }
}

// Reads the session's current pick, choosing one on first read if
// nothing has been stored yet (e.g. a signed-out visitor browsing
// Explore who never triggered a 'SIGNED_IN' event).
export function getExploreHeroImage() {
  let index = 0
  try {
    const stored = sessionStorage.getItem(HERO_SEED_KEY)
    if (stored === null) {
      index = randomIndex()
      sessionStorage.setItem(HERO_SEED_KEY, String(index))
    } else {
      index = Number(stored)
    }
  } catch {
    index = 0
  }
  return EXPLORE_HERO_IMAGES[index] ?? EXPLORE_HERO_IMAGES[0]
}

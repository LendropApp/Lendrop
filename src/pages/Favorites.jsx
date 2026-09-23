import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import MobileNav from '../components/MobileNav'
import { supabase } from '../lib/supabaseClient'
import ProductCard from '../components/ProductCard'
import AuroraBlobs from '../components/background/AuroraBlobs'
import useSmartBack from '../hooks/useSmartBack'

export default function Favorites() {
  const { user } = useAuth()
  const goBack = useSmartBack('/explore')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadFavorites = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        item_id,
        item:items(
          id, title, description, price_per_day, location_city, is_available, created_at,
          category:categories(id, name, slug),
          photos:item_photos(storage_path, display_order),
          owner:profiles!items_owner_id_fkey(id, full_name, avatar_url, verification_status, average_rating, total_reviews)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setError('Could not load your saved items. Please refresh.')
    } else {
      setItems((data ?? []).map((f) => f.item).filter(Boolean))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (user) loadFavorites()
  }, [user, loadFavorites])

  async function handleToggleFavorite(item) {
    setItems((prev) => prev.filter((i) => i.id !== item.id))
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', item.id)
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <header className="glass sticky top-0 z-50">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to Explore"
            className="flex items-center gap-2 text-sm font-medium text-text-muted transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </button>
          <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
          <div className="flex w-24 justify-end">
            <MobileNav />
          </div>
        </div>
      </header>

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-6xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Saved items</h1>
          <p className="mt-1 text-sm text-text-muted">
            Everything you've favorited while browsing Explore.
          </p>

          {error ? (
            <p className="py-20 text-center text-sm text-red-600">{error}</p>
          ) : loading ? (
            <p className="py-20 text-center text-sm text-text-muted">Loading saved items…</p>
          ) : items.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  isOwner={false}
                  isFavorited
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-20 text-center">
              <Heart className="h-8 w-8 text-text-muted" />
              <p className="font-display text-lg font-semibold text-text">No saved items yet</p>
              <p className="text-sm text-text-muted">
                Tap the heart on any listing in Explore to save it here.
              </p>
              <Link
                to="/explore"
                className="mt-2 text-sm font-semibold text-primary hover:underline"
              >
                Browse Explore
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

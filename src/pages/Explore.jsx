import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Heart, Bell, Star, Store, Plus, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'
import LockerAvatar from '../components/LockerAvatar'
import AuroraBlobs from '../components/background/AuroraBlobs'

const ROUTES = {
  becomeLender: '/become-host',
  lenderDashboard: '/host/dashboard',
  favorites: '/favorites',
  notifications: '/notifications',
  profile: '/dashboard',
  publish: '/publish',
}

function coverUrlFor(photos) {
  if (!photos?.length) return null
  const [cover] = [...photos].sort((a, b) => a.display_order - b.display_order)
  return supabase.storage.from('item-photos').getPublicUrl(cover.storage_path).data.publicUrl
}

export default function Explore() {
  const { user, isHost } = useAuth()

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  const isVerified = Boolean(user)
  const hasUnreadNotifications = true

  useEffect(() => {
    let cancelled = false
    supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => {
        if (!cancelled) setCategories(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    supabase
      .from('items')
      .select(`
        id, title, description, price_per_day, location_city, is_available, created_at,
        category:categories(id, name, slug),
        photos:item_photos(storage_path, display_order),
        owner:profiles!items_owner_id_fkey(id, full_name, avatar_url, verification_status, average_rating, total_reviews)
      `)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setItemsError('Could not load listings. Please refresh.')
        } else {
          setItems(data ?? [])
        }
        setItemsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const cities = useMemo(
    () => [...new Set(items.map((item) => item.location_city))].sort(),
    [items]
  )

  function handleCategoryClick(slug) {
    setSelectedCategory((prev) => (prev === slug ? null : slug))
  }

  function handleSearchChange(e) {
    setSearchTerm(e.target.value)
  }

  function clearFilters() {
    setSelectedCategory(null)
    setSelectedCity(null)
    setOnlyAvailable(true)
    setSearchTerm('')
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const isFiltering = Boolean(
    normalizedSearch || selectedCategory || selectedCity || !onlyAvailable
  )

  const filteredListings = useMemo(() => {
    return items.filter((item) => {
      if (onlyAvailable && !item.is_available) return false
      if (selectedCategory && item.category?.slug !== selectedCategory) return false
      if (selectedCity && item.location_city !== selectedCity) return false
      if (normalizedSearch) {
        const haystack = `${item.title} ${item.description}`.toLowerCase()
        if (!haystack.includes(normalizedSearch)) return false
      }
      return true
    })
  }, [items, onlyAvailable, selectedCategory, selectedCity, normalizedSearch])

  const sectionTitle = normalizedSearch
    ? `Results for "${searchTerm}"`
    : selectedCategory
      ? categories.find((c) => c.slug === selectedCategory)?.name
      : 'Recommended for you'

  return (
    <div className="min-h-screen bg-soft-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/85 shadow-[0_8px_24px_-18px_rgba(67,48,117,0.35)] backdrop-blur-md">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4 sm:px-10">
          <Link to="/" className="shrink-0">
            <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
          </Link>

          {/* Search — desktop */}
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-jet-black/10 bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md focus-within:border-lavender focus-within:shadow-[0_0_0_1px_rgba(165,140,244,0.4),0_8px_24px_-8px_rgba(165,140,244,0.5)] focus-within:ring-2 focus-within:ring-lavender/30 sm:flex">
            <Search className="h-4 w-4 shrink-0 text-jet-black/35" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search cameras, tools, gear…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-jet-black/35"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
            {/* Publish an item */}
            <Link
              to={ROUTES.publish}
              aria-label="Publish an item"
              className="flex items-center gap-1.5 rounded-full border border-jet-black/10 px-3 py-2 text-xs font-semibold text-jet-black/70 transition hover:border-lavender hover:text-deep-purple sm:px-4"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Publish</span>
            </Link>

            {/* Become a Lender / Lender dashboard */}
            <Link
              to={isHost ? ROUTES.lenderDashboard : ROUTES.becomeLender}
              aria-label={isHost ? 'Lender dashboard' : 'Become a Lender'}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                isHost
                  ? 'border border-jet-black/10 text-jet-black/70 hover:border-lavender hover:text-deep-purple'
                  : 'bg-linear-to-r from-deep-purple to-lavender text-soft-white shadow-[0_4px_20px_-4px_rgba(67,48,117,0.5)] hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.6)] hover:brightness-105'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {isHost ? 'Lender dashboard' : 'Become a Lender'}
              </span>
            </Link>

            {/* Favorites */}
            <Link
              to={ROUTES.favorites}
              aria-label="Saved items"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-jet-black/10 text-jet-black/60 transition hover:border-lavender hover:text-deep-purple"
            >
              <Heart className="h-4 w-4" />
            </Link>

            {/* Notifications */}
            <Link
              to={ROUTES.notifications}
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-jet-black/10 text-jet-black/60 transition hover:border-lavender hover:text-deep-purple"
            >
              <Bell className="h-4 w-4" />
              {hasUnreadNotifications && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-lavender ring-2 ring-soft-white" />
              )}
            </Link>

            {/* Profile */}
            <Link
              to={ROUTES.profile}
              aria-label="Your account"
              className="rounded-6px transition hover:ring-2 hover:ring-lavender/40"
            >
              <LockerAvatar label={firstName} verified={isVerified} size="md" />
            </Link>
          </div>
        </div>

        {/* Search bar, mobile only */}
        <div className="flex items-center gap-2 border-t border-jet-black/5 px-6 py-3 sm:hidden">
          <Search className="h-4 w-4 shrink-0 text-jet-black/35" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search cameras, tools, gear…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-jet-black/35"
          />
        </div>
      </header>

      {/* ================= GREETING ================= */}
      <section className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 pt-10 sm:px-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-lavender/30 bg-lavender/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-deep-purple">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lavender" />
            Live inventory · San Salvador
          </span>
          <h1 className="mt-3 font-display text-2xl font-bold text-jet-black sm:text-3xl">
            {firstName ? `Welcome back, ${firstName}.` : 'Find what you need, nearby.'}
          </h1>
          <p className="mt-1 text-sm text-jet-black/50">
            Every listing below is verified and ready to pick up from a locker near you.
          </p>
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => {
            const active = selectedCategory === cat.slug
            const Icon = getCategoryIcon(cat.slug)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border-transparent bg-linear-to-r from-deep-purple to-lavender text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)]'
                    : 'border-jet-black/10 text-jet-black/60 hover:border-lavender hover:text-deep-purple'
                }`}
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 1.75} />
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* City + availability filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cities.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-full border border-jet-black/10 px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-jet-black/40" />
              <select
                value={selectedCity ?? ''}
                onChange={(e) => setSelectedCity(e.target.value || null)}
                className="bg-transparent text-xs font-medium text-jet-black/70 outline-none"
              >
                <option value="">All cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOnlyAvailable((prev) => !prev)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              onlyAvailable
                ? 'border-lavender/40 bg-lavender/10 text-deep-purple'
                : 'border-jet-black/10 text-jet-black/50 hover:border-lavender hover:text-deep-purple'
            }`}
          >
            {onlyAvailable ? 'Available now' : 'Showing all'}
          </button>
        </div>
      </section>

      {/* ================= LISTINGS ================= */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-jet-black">
            {sectionTitle}
          </h2>
          {isFiltering && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-deep-purple hover:text-lavender"
            >
              Clear filters
            </button>
          )}
        </div>

        {itemsError ? (
          <p className="py-20 text-center text-sm text-red-600">{itemsError}</p>
        ) : itemsLoading ? (
          <p className="py-20 text-center text-sm text-jet-black/40">Loading listings…</p>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {filteredListings.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-20 text-center">
            <p className="font-display text-lg font-semibold text-jet-black">
              No items found
            </p>
            <p className="text-sm text-jet-black/50">
              Try a different search, or browse another category.
            </p>
          </div>
        )}
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-jet-black/5 px-6 py-8 text-center sm:px-10">
        <a href="#" className="text-sm font-medium text-jet-black/50 hover:text-deep-purple">
          Need help?
        </a>
      </footer>
    </div>
  )
}

function ProductCard({ item }) {
  const coverUrl = coverUrlFor(item.photos)
  const hasReviews = (item.owner?.total_reviews ?? 0) > 0

  return (
    <article className="group cursor-pointer transition duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden rounded-2xl bg-jet-black/5 shadow-sm transition duration-300 group-hover:shadow-[0_16px_36px_-14px_rgba(165,140,244,0.6)]">
        {coverUrl && (
          <img
            src={coverUrl}
            alt={item.title}
            className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-105"
          />
        )}
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-jet-black/5 transition group-hover:ring-lavender/50" />

        <button
          type="button"
          aria-label="Save"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-jet-black/40 text-soft-white backdrop-blur transition hover:bg-jet-black/60"
        >
          <Heart className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-jet-black">{item.title}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <LockerAvatar
              label={item.owner?.full_name}
              photoUrl={item.owner?.avatar_url}
              verified={item.owner?.verification_status === 'verified'}
              size="sm"
            />
            <span className="truncate text-xs text-jet-black/50">{item.owner?.full_name}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {hasReviews ? (
            <>
              <Star className="h-3.5 w-3.5 fill-jet-black text-jet-black" />
              <span className="font-mono text-xs font-medium text-jet-black">
                {Number(item.owner.average_rating).toFixed(1)}
              </span>
            </>
          ) : (
            <span className="rounded-full bg-lavender/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-deep-purple">
              New
            </span>
          )}
        </div>
      </div>

      <p className="mt-1.5 font-mono text-sm font-semibold text-jet-black">
        ${item.price_per_day}
        <span className="font-body font-normal text-jet-black/45"> / day</span>
      </p>
    </article>
  )
}

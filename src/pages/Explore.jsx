import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  Heart,
  Bell,
  Star,
  Store,
  Shirt,
  Plane,
  Laptop,
  Luggage,
  Bike,
  Wrench,
  PartyPopper,
  Tent,
  Dumbbell,
  Music,
  Camera,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient.js'
import LockerAvatar from '../components/LockerAvatar'


const ROUTES = {
  becomeLender: '/become-lender',
  lenderDashboard: '/host/dashboard',
  favorites: '/favorites',
  notifications: '/notifications',
  profile: '/profile',
}

const CATEGORIES = [
  { id: 'clothing', label: 'Clothing', Icon: Shirt },
  { id: 'drones', label: 'Drones', Icon: Plane },
  { id: 'electronics', label: 'Electronics', Icon: Laptop },
  { id: 'suitcases', label: 'Suitcases', Icon: Luggage },
  { id: 'bicycles', label: 'Bicycles', Icon: Bike },
  { id: 'tools', label: 'Tools', Icon: Wrench },
  { id: 'costumes', label: 'Costumes', Icon: PartyPopper },
  { id: 'camping-equipment', label: 'Camping Equipment', Icon: Tent },
  { id: 'sports-equipment', label: 'Sports Equipment', Icon: Dumbbell },
  { id: 'musical-instruments', label: 'Musical Instruments', Icon: Music },
  { id: 'cameras', label: 'Cameras', Icon: Camera },
]

export default function Explore() {
  const { user } = useAuth()
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [listings, setListings] = useState([])
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    const fetchListings = async () => {
      const { data, error } = await supabase
        .from('items')
        .select(`
          id,
          title,
          description,
          price_per_day,
          is_available,
          category:categories(
            id,
            name,
            slug
          ),
          owner:profiles!items_owner_id_fkey(
            id,
            full_name,
            avatar_url,
            verification_status,
            average_rating
          )
        `)

      if (error) {
        console.error('Error loading listings:', error)
        return
      }

      console.log('Listings from Supabase:', data)

      setListings(
        data.map((item) => ({
          id: item.id,
          title: item.title,
          category: item.category?.slug,
          price: item.price_per_day,
          image: null,
          owner: {
            name: item.owner?.full_name || 'Unknown',
            photoUrl: item.owner?.avatar_url || '',
            verified: item.owner?.verification_status === 'verified',
          },
          rating: item.owner?.average_rating || 0,
        }))
      )
    }

    fetchListings()
  }, [])

  useEffect(() => {
    async function loadCurrentProfile() {
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading current profile avatar:', error)
        return
      }

      setAvatarUrl(data?.avatar_url || '')
    }

    loadCurrentProfile()
  }, [user])

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
  const isHost = false
  const isVerified = Boolean(user)
  const hasUnreadNotifications = true

  function handleCategoryClick(id) {
    setSearchTerm('')
    setSelectedCategory((prev) => (prev === id ? null : id))
  }

  function handleSearchChange(e) {
    setSelectedCategory(null)
    setSearchTerm(e.target.value)
  }

  function clearFilters() {
    setSelectedCategory(null)
    setSearchTerm('')
  }

  const normalizedSearch = searchTerm.trim().toLowerCase()
  const isFiltering = Boolean(normalizedSearch || selectedCategory)

  const filteredListings = useMemo(() => {
    if (normalizedSearch) {
      return listings.filter((item) =>
        item.title.toLowerCase().includes(normalizedSearch)
      )
    }
    if (selectedCategory) {
      return listings.filter((item) => item.category === selectedCategory)
    }
    return listings
  }, [normalizedSearch, selectedCategory, listings])

  const sectionTitle = normalizedSearch
    ? `Results for "${searchTerm}"`
    : selectedCategory
      ? CATEGORIES.find((c) => c.id === selectedCategory)?.label
      : 'Recommended for you'

  return (
    <div className="min-h-screen bg-soft-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/85 shadow-[0_8px_24px_-18px_rgba(67,48,117,0.35)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-4 sm:px-10">
          <Link to="/" className="shrink-0">
            <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
          </Link>

          {/* Search — desktop */}
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border border-jet-black/10 bg-white px-4 py-2.5 shadow-sm transition hover:shadow-md focus-within:border-lavender focus-within:shadow-md focus-within:ring-2 focus-within:ring-lavender/30 sm:flex">
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
            {/* Become a Lender / Lender dashboard */}
            <Link
              to={isHost ? ROUTES.lenderDashboard : ROUTES.becomeLender}
              aria-label={isHost ? 'Lender dashboard' : 'Become a Lender'}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 ${
                isHost
                  ? 'border border-jet-black/10 text-jet-black/70 hover:border-lavender hover:text-deep-purple'
                  : 'bg-linear-to-r from-deep-purple to-lavender text-soft-white shadow-sm hover:shadow-md hover:brightness-105'
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
            <LockerAvatar
              label={firstName}
              photoUrl={avatarUrl}
              verified={isVerified}
              size="md"
            />
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
      <section className="mx-auto max-w-6xl px-6 pt-10 sm:px-10">
        <h1 className="font-display text-2xl font-bold text-jet-black sm:text-3xl">
          {firstName ? `Welcome back, ${firstName}.` : 'Find what you need, nearby.'}
        </h1>
        <p className="mt-1 text-sm text-jet-black/50">
          Every listing below is verified and ready to pick up from a locker near you.
        </p>
      </section>

      {/* ================= CATEGORIES ================= */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mt-6 flex gap-55 overflow-x-auto border-b border-jet-black/5 pb-4">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex shrink-0 flex-col items-center gap-2 border-b-2 pb-3 text-xs font-medium transition ${
                  active
                    ? 'border-jet-black text-jet-black'
                    : 'border-transparent text-jet-black/40 hover:text-jet-black/70'
                }`}
              >
                <cat.Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
                {cat.label}
              </button>
            )
          })}
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

        {filteredListings.length > 0 ? (
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


function ProductCard({ item }) {
  return (
    <article className="group cursor-pointer">
      <div className="relative overflow-hidden rounded-2xl bg-jet-black/5">
        <img
          src={item.image}
          alt={item.title}
          className="aspect-4/3 w-full object-cover transition duration-300 group-hover:scale-105"
        />

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
            <LockerAvatar label={item.owner.name} verified={item.owner.verified} size="sm" />
            <span className="truncate text-xs text-jet-black/50">{item.owner.name}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          <Star className="h-3.5 w-3.5 fill-jet-black text-jet-black" />
          <span className="font-mono text-xs font-medium text-jet-black">{item.rating}</span>
        </div>
      </div>

      <p className="mt-1.5 font-mono text-sm font-semibold text-jet-black">
        ${item.price}
        <span className="font-body font-normal text-jet-black/45"> / day</span>
      </p>
    </article>
  )
 }
}
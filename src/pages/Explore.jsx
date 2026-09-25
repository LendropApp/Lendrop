import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  Heart,
  Bell,
  MessageCircle,
  Store,
  Plus,
  MapPin,
  UserCircle2,
  Menu,
  CreditCard,
  LayoutDashboard,
  Settings as SettingsIcon,
  Truck,
  ShieldCheck,
  Sparkles,
  History,
  LogOut,
  PackageSearch,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'
import LockerAvatar from '../components/LockerAvatar'
import ProductCard from '../components/ProductCard'
import MobileNav from '../components/MobileNav'
import { buildSteps } from '../components/ProfileCompletion'
import Logo from '../components/Logo'
import SiteFooter from '../components/SiteFooter'

const ROUTES = {
  becomeLender: '/become-host',
  favorites: '/favorites',
  messages: '/messages',
  notifications: '/notifications',
  profile: '/profile',
  publish: '/publish',
  tracking: '/rental-tracking',
}

export default function Explore() {
  const { user, isHost, profile, profileLoading, signOut } = useAuth()
  const navigate = useNavigate()
  // The landing page links here with ?q= (hero search) and ?category=.
  const [searchParams] = useSearchParams()

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get('category'))
  const [selectedCity, setSelectedCity] = useState(null)
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? '')
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [rentedItemIds, setRentedItemIds] = useState(new Set())

  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasAppliedDefaultCity = useRef(false)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  const isVerified = Boolean(user)
  const hasUnreadNotifications = unreadNotifications > 0

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

  useEffect(() => {
    let cancelled = false
    supabase.rpc('get_currently_rented_item_ids').then(({ data }) => {
      if (!cancelled) setRentedItemIds(new Set((data ?? []).map((row) => row.item_id)))
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setFavoriteIds(new Set())
      return
    }
    let cancelled = false
    supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!cancelled) setFavoriteIds(new Set((data ?? []).map((f) => f.item_id)))
      })
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0)
      return
    }
    let cancelled = false

    Promise.all([
      supabase.from('notifications').select('type').eq('user_id', user.id).eq('is_read', false),
      supabase
        .from('user_preferences')
        .select('notify_messages, notify_reservations, notify_reviews, default_city')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]).then(([{ data: unread }, { data: prefs }]) => {
      if (cancelled) return

      const mutedTypes = new Set()
      if (prefs?.notify_messages === false) mutedTypes.add('message')
      if (prefs?.notify_reservations === false) {
        mutedTypes.add('reservation')
        mutedTypes.add('payment')
      }
      if (prefs?.notify_reviews === false) mutedTypes.add('review')
      setUnreadNotifications((unread ?? []).filter((n) => !mutedTypes.has(n.type)).length)

      // Apply the saved default browsing city once, without overriding a
      // filter the user has already picked this session.
      if (prefs?.default_city && !hasAppliedDefaultCity.current) {
        hasAppliedDefaultCity.current = true
        setSelectedCity(prefs.default_city)
      }
    })

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 72)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleSignOut() {
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  const profileSteps = useMemo(() => buildSteps(user, profile), [user, profile])
  const profileIncomplete = Boolean(user) && !profileLoading && profileSteps.some((s) => !s.done)

  const cities = useMemo(
    () => [...new Set(items.map((item) => item.location_city))].sort(),
    [items]
  )

  async function handleToggleFavorite(item) {
    if (!user) return
    const isFavorited = favoriteIds.has(item.id)
    if (isFavorited) {
      setFavoriteIds((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', item.id)
    } else {
      setFavoriteIds((prev) => new Set(prev).add(item.id))
      await supabase.from('favorites').insert({ user_id: user.id, item_id: item.id })
    }
  }

  async function handleDeleteItem(item) {
    const paths = (item.photos || []).map((p) => p.storage_path)
    if (paths.length > 0) {
      await supabase.storage.from('item-photos').remove(paths)
    }
    const { error } = await supabase.from('items').delete().eq('id', item.id)
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== item.id))
    }
    return { error }
  }

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
    <div className="min-h-screen bg-bg pb-28 md:pb-0">
      {/* ================= HEADER ================= */}
      <header className="glass sticky top-0 z-50 shadow-[0_8px_24px_-18px_rgba(67,48,117,0.35)]">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />

        {!scrolled && (
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 pt-4 sm:px-10">
            <Link to="/" className="shrink-0">
              <Logo />
            </Link>

            {/* Main nav — centered, like Airbnb's top tabs. Desktop only:
                on mobile every one of these lives in MobileNav instead,
                so the two never show the same link twice. */}
            <nav className="hidden items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-sm md:flex">
              {isHost && (
                <Link
                  to={ROUTES.publish}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:bg-surface-raised hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Publish</span>
                </Link>
              )}
              <Link
                to={ROUTES.favorites}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:bg-surface-raised hover:text-primary"
              >
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </Link>
              <Link
                to={ROUTES.messages}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:bg-surface-raised hover:text-primary"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Messages</span>
              </Link>
              <Link
                to={ROUTES.notifications}
                className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:bg-surface-raised hover:text-primary"
              >
                <Bell className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Alerts</span>
                {hasUnreadNotifications && (
                  <span className="absolute right-1.5 top-1 h-1.5 w-1.5 animate-pulse rounded-full bg-lavender ring-2 ring-white" />
                )}
              </Link>
              <Link
                to={ROUTES.tracking}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:bg-surface-raised hover:text-primary"
              >
                <PackageSearch className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Track</span>
              </Link>
            </nav>

            {!isHost && (
              <Link
                to={ROUTES.becomeLender}
                className="hidden shrink-0 items-center gap-1.5 rounded-full cta-brand px-4 py-2 text-xs font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(67,48,117,0.5)] transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.6)] hover:brightness-105 md:flex"
              >
                <Store className="h-3.5 w-3.5" />
                Become a host
              </Link>
            )}

            {/* Profile, next to the hamburger with the rest of the options */}
            <div className="relative flex shrink-0 items-center gap-2">
              <Link
                to={ROUTES.profile}
                aria-label="Your account"
                className="rounded-full transition hover:ring-2 hover:ring-lavender/40"
              >
                <LockerAvatar label={firstName} photoUrl={profile?.avatar_url} verified={isVerified} size="md" />
              </Link>
              <MobileNav />
              <button
                type="button"
                aria-label="More options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="hidden h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted transition hover:border-primary hover:text-primary md:flex"
              >
                <Menu className="h-4 w-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-border bg-surface py-1.5 shadow-xl">
                    <Link
                      to="/history"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-raised"
                    >
                      <History className="h-4 w-4 text-text-muted" />
                      Activity
                    </Link>
                    {isHost && (
                      <Link
                        to="/owner-delivery"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-raised"
                      >
                        <Truck className="h-4 w-4 text-text-muted" />
                        Drop-offs & returns
                      </Link>
                    )}
                    <Link
                      to="/payment-methods"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-raised"
                    >
                      <CreditCard className="h-4 w-4 text-text-muted" />
                      Payment methods
                    </Link>
                    <Link
                      to="/verification"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-raised"
                    >
                      <ShieldCheck className="h-4 w-4 text-text-muted" />
                      Verification
                    </Link>
                    <Link
                      to="/premium"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-raised"
                    >
                      <Sparkles className="h-4 w-4 text-text-muted" />
                      Premium
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-raised"
                    >
                      <SettingsIcon className="h-4 w-4 text-text-muted" />
                      Settings
                    </Link>
                    {profile?.is_admin && (
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-text transition hover:bg-surface-raised"
                      >
                        <LayoutDashboard className="h-4 w-4 text-text-muted" />
                        Admin panel
                      </Link>
                    )}
                    <div className="my-1.5 border-t border-border" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search — the one thing that stays visible once you scroll */}
        <div className={`mx-auto max-w-2xl px-6 sm:px-10 ${scrolled ? 'py-3' : 'pb-4 pt-3'}`}>
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 shadow-sm transition hover:shadow-md focus-within:border-primary focus-within:shadow-[0_0_0_1px_rgba(165,140,244,0.4),0_8px_24px_-8px_rgba(165,140,244,0.5)] focus-within:ring-2 focus-within:ring-lavender/30">
            <Search className="h-4 w-4 shrink-0 text-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search cameras, tools, gear…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-muted"
            />
          </div>
        </div>
      </header>

      {/* ================= GREETING: the animated brand field ================= */}
      <section className="brand-field">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
          <h1 className="text-4xl font-extrabold leading-[1.02] text-soft-white sm:text-6xl">
            {firstName ? `Welcome back, ${firstName}.` : 'Find what you need, nearby.'}
          </h1>
          <p className="mt-4 max-w-[52ch] text-soft-white/85">
            Everything here is picked up from a locker. No meetups.
          </p>
        </div>
      </section>

      {/* ================= PROFILE COMPLETION NUDGE ================= */}
      {profileIncomplete && (
        <section className="mx-auto max-w-6xl px-6 pt-6 sm:px-10">
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-primary">
                <UserCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text">Finish setting up your profile</p>
                <p className="text-xs text-text-muted">
                  Renters trust completed profiles more. Add what's missing to keep using Lendrop.
                </p>
              </div>
            </div>
            <Link
              to="/profile/edit"
              className="shrink-0 rounded-xl cta-brand px-4 py-2 text-sm font-semibold text-soft-white"
            >
              Complete profile
            </Link>
          </div>
        </section>
      )}

      {/* ================= CATEGORIES ================= */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Categories">
          {categories.map((cat) => {
            const active = selectedCategory === cat.slug
            const Icon = getCategoryIcon(cat.slug)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                  active
                    ? 'stamp'
                    : 'border border-border bg-surface text-text-muted hover:border-primary hover:text-text'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* City + availability filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cities.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2">
              <MapPin className="h-4 w-4 text-text-muted" aria-hidden="true" />
              <select
                value={selectedCity ?? ''}
                onChange={(e) => setSelectedCity(e.target.value || null)}
                aria-label="City"
                className="bg-transparent text-sm font-semibold text-text outline-none"
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
            aria-pressed={onlyAvailable}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              onlyAvailable
                ? 'stamp'
                : 'border border-border bg-surface text-text-muted hover:border-primary hover:text-text'
            }`}
          >
            Available now
          </button>
        </div>
      </section>

      {/* ================= LISTINGS ================= */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{sectionTitle}</h2>
            {!itemsLoading && !itemsError && (
              <p className="mt-1 text-sm text-text-muted">
                <span className="num text-text">{filteredListings.length}</span>{' '}
                {filteredListings.length === 1 ? 'item' : 'items'}
              </p>
            )}
          </div>
          {isFiltering && (
            <button
              type="button"
              onClick={clearFilters}
              className="shrink-0 text-sm font-semibold text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {itemsError ? (
          <p role="alert" className="py-20 text-center text-sm text-danger">{itemsError}</p>
        ) : itemsLoading ? (
          <p className="py-20 text-center text-sm text-text-muted">Loading listings…</p>
        ) : filteredListings.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
            {filteredListings.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                isOwner={Boolean(user) && item.owner?.id === user.id}
                isFavorited={favoriteIds.has(item.id)}
                isCurrentlyRented={rentedItemIds.has(item.id)}
                onDelete={handleDeleteItem}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-20 text-center">
            <p className="text-xl font-bold">No items match</p>
            <p className="text-sm text-text-muted">
              Try a different search, or browse another category.
            </p>
            {isFiltering && (
              <button
                type="button"
                onClick={clearFilters}
                className="cta-outline mt-4 rounded-xl px-4 py-1.5 text-sm font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* ================= FOOTER ================= */}
      <SiteFooter />
    </div>
  )
}

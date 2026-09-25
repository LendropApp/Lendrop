import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  Mail,
  PackageSearch,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'
import { getExploreHeroImage } from '../lib/exploreHero'
import LockerAvatar from '../components/LockerAvatar'
import ProductCard from '../components/ProductCard'
import MobileNav from '../components/MobileNav'
import { buildSteps } from '../components/ProfileCompletion'
import Logo from '../components/Logo'

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

  const [categories, setCategories] = useState([])
  const [items, setItems] = useState([])
  const [itemsLoading, setItemsLoading] = useState(true)
  const [itemsError, setItemsError] = useState('')

  const [selectedCategory, setSelectedCategory] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [rentedItemIds, setRentedItemIds] = useState(new Set())

  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const hasAppliedDefaultCity = useRef(false)

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]

  const isVerified = Boolean(user)
  const hasUnreadNotifications = unreadNotifications > 0
  const heroImage = useMemo(() => getExploreHeroImage(), [])

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
                Become a Lender
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

      {/* ================= GREETING ================= */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="relative mx-auto grid max-w-6xl gap-8 px-6 pt-10 pb-12 sm:px-10 sm:pt-14 sm:pb-16 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-raised px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lavender" />
              Live inventory · San Salvador
            </span>
            <h1 className="mt-3 font-display text-2xl font-bold text-text sm:text-3xl">
              {firstName ? `Welcome back, ${firstName}.` : 'Find what you need, nearby.'}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
              Every listing below is verified and ready to pick up from a locker near you.
            </p>
          </div>

          <div className="relative aspect-4/3 overflow-hidden rounded-3xl shadow-[0_24px_60px_-24px_rgba(67,48,117,0.45)]">
            <img
              src={heroImage.src}
              alt={heroImage.alt}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-jet-black/45 via-transparent to-transparent" />
            <span className="absolute bottom-4 left-4 rounded-full border border-white/30 bg-white/20 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
              Ready for pickup
            </span>
          </div>
        </div>
      </section>

      {/* ================= PROFILE COMPLETION NUDGE ================= */}
      {profileIncomplete && (
        <section className="mx-auto max-w-6xl px-6 pt-6 sm:px-10">
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
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
              className="shrink-0 rounded-full cta-brand px-4 py-2 text-xs font-semibold text-soft-white glow-sm transition hover:brightness-105"
            >
              Complete profile
            </Link>
          </div>
        </section>
      )}

      {/* ================= CATEGORIES ================= */}
      <section className="mx-auto max-w-6xl px-6 sm:px-10">
        <div className="mt-6 flex gap-5 overflow-x-auto pb-1 sm:gap-7">
          {categories.map((cat) => {
            const active = selectedCategory === cat.slug
            const Icon = getCategoryIcon(cat.slug)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={`flex shrink-0 flex-col items-center gap-1.5 border-b-2 pb-2 pt-1 text-[11px] font-semibold transition ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-muted hover:border-border hover:text-text'
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.6} />
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* City + availability filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {cities.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5">
              <MapPin className="h-3.5 w-3.5 text-text-muted" />
              <select
                value={selectedCity ?? ''}
                onChange={(e) => setSelectedCity(e.target.value || null)}
                className="bg-transparent text-xs font-medium text-text-muted outline-none"
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
                ? 'border-border bg-surface-raised text-primary'
                : 'border-border text-text-muted hover:border-primary hover:text-primary'
            }`}
          >
            {onlyAvailable ? 'Available now' : 'Showing all'}
          </button>
        </div>
      </section>

      {/* ================= LISTINGS ================= */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-text">
            {sectionTitle}
          </h2>
          {isFiltering && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {itemsError ? (
          <p className="py-20 text-center text-sm text-red-600">{itemsError}</p>
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
            <p className="font-display text-lg font-semibold text-text">
              No items found
            </p>
            <p className="text-sm text-text-muted">
              Try a different search, or browse another category.
            </p>
          </div>
        )}
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <Logo />
              <p className="mt-3 max-w-40 text-xs leading-relaxed text-text-muted">
                Rent what you need, from people near you in El Salvador.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <a
                  href="mailto:hola@lendrop.app"
                  aria-label="Email"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-muted transition hover:border-primary hover:text-primary"
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">Explore</p>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                <li><Link to="/categories" className="hover:text-primary">Browse categories</Link></li>
                <li><Link to={ROUTES.becomeLender} className="hover:text-primary">Become a Lender</Link></li>
                <li><Link to="/locker-coverage" className="hover:text-primary">Locker locations</Link></li>
              </ul>
            </div>

            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">Support</p>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                <li><Link to="/help" className="hover:text-primary">Help center</Link></li>
                <li><Link to="/history" className="hover:text-primary">Your activity</Link></li>
                <li><a href="mailto:hola@lendrop.app" className="hover:text-primary">Contact us</a></li>
              </ul>
            </div>

            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">Account</p>
              <ul className="mt-3 space-y-2 text-sm text-text-muted">
                <li><Link to={ROUTES.profile} className="hover:text-primary">Your profile</Link></li>
                <li><Link to="/payment-methods" className="hover:text-primary">Payment methods</Link></li>
                <li><Link to="/verification" className="hover:text-primary">Verification</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 border-t border-border pt-6 text-xs text-text-muted sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} Lendrop · San Salvador, El Salvador</span>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-primary">Terms</a>
              <a href="#" className="hover:text-primary">Privacy</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

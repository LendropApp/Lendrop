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
import LockerAvatar from '../components/LockerAvatar'
import ProductCard from '../components/ProductCard'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import Plate from '../components/ui/Plate'
import Select from '../components/ui/Select'
import Skeleton from '../components/ui/Skeleton'
import Toast from '../components/ui/Toast'
import MobileNav from '../components/MobileNav'
import { buildSteps } from '../components/ProfileCompletion'

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

  // Square plate, 2px ink, physical press — the shared skin for every small
  // control in the header and the filter row (sec. 4).
  const CHIP =
    'inline-flex min-h-11 items-center gap-1.5 rounded-door border-2 border-ink bg-panel px-3 text-small font-bold text-ink press-sm'

  return (
    <div className="min-h-screen bg-steel pb-28 md:pb-0">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-panel">
        {!scrolled && (
          <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 pt-4 md:px-8">
            <Link to="/" className="flex min-h-11 shrink-0 items-center rounded-door">
              <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
            </Link>

            {/* Desktop only: on mobile every one of these lives in MobileNav
                instead, so the two never show the same link twice. */}
            <nav className="hidden items-center gap-2 lg:flex">
              {isHost && (
                <Link to={ROUTES.publish} className={CHIP}>
                  <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                  Publish
                </Link>
              )}
              <Link to={ROUTES.favorites} className={CHIP}>
                <Heart className="size-4" strokeWidth={2} aria-hidden="true" />
                Saved
              </Link>
              <Link to={ROUTES.messages} className={CHIP}>
                <MessageCircle className="size-4" strokeWidth={2} aria-hidden="true" />
                Messages
              </Link>
              <Link to={ROUTES.notifications} className={`relative ${CHIP}`}>
                <Bell className="size-4" strokeWidth={2} aria-hidden="true" />
                Alerts
                {hasUnreadNotifications && (
                  <>
                    {/* LED, not a pulsing dot: same vocabulary as every other
                        state in the app (sec. 7.3). */}
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 size-2.5 rounded-full border-[1.5px] border-ink bg-lilac ring-3 ring-lilac/35"
                    />
                    <span className="sr-only">Unread</span>
                  </>
                )}
              </Link>
              <Link to={ROUTES.tracking} className={CHIP}>
                <PackageSearch className="size-4" strokeWidth={2} aria-hidden="true" />
                Track
              </Link>
            </nav>

            {/* Wrapper carries the breakpoint, not the Button: Button's own base
                class sets `inline-flex`, and whether a caller's `hidden` beats it
                depends on stylesheet order rather than attribute order -- here it
                lost, and the CTA showed at 360px. */}
            {!isHost && (
              <div className="hidden lg:block">
                <Button as={Link} to={ROUTES.becomeLender} size="sm" icon={Store}>
                  Become a Lender
                </Button>
              </div>
            )}

            <div className="relative flex shrink-0 items-center gap-2">
              <Link
                to={ROUTES.profile}
                aria-label="Your account"
                className="flex size-11 items-center justify-center rounded-door"
              >
                <LockerAvatar
                  label={firstName}
                  photoUrl={profile?.avatar_url}
                  verified={isVerified}
                  size="md"
                />
              </Link>
              <MobileNav />
              <button
                type="button"
                aria-label="More options"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className="hidden size-11 items-center justify-center rounded-door border-2 border-ink bg-panel text-ink press-sm lg:flex"
              >
                <Menu className="size-4" strokeWidth={2} aria-hidden="true" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-door border-[3px] border-ink bg-panel py-1 shadow-hard-md">
                    {[
                      { to: '/history', icon: History, label: 'Activity' },
                      ...(isHost
                        ? [{ to: '/owner-delivery', icon: Truck, label: 'Drop-offs & returns' }]
                        : []),
                      { to: '/payment-methods', icon: CreditCard, label: 'Payment methods' },
                      { to: '/verification', icon: ShieldCheck, label: 'Verification' },
                      { to: '/premium', icon: Sparkles, label: 'Premium' },
                      { to: '/settings', icon: SettingsIcon, label: 'Settings' },
                      ...(profile?.is_admin
                        ? [{ to: '/admin', icon: LayoutDashboard, label: 'Admin panel' }]
                        : []),
                    ].map(({ to, icon: Icon, label }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-body font-medium text-ink transition-colors hover:bg-lilac-200"
                      >
                        <Icon className="size-4 text-steel-600" strokeWidth={2} aria-hidden="true" />
                        {label}
                      </Link>
                    ))}
                    <div className="my-1 border-t-2 border-ink" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-body font-medium text-alert transition-colors hover:bg-lilac-200"
                    >
                      <LogOut className="size-4" strokeWidth={2} aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Search — the one thing that stays visible once you scroll */}
        <div className={`mx-auto max-w-[1200px] px-4 md:px-8 ${scrolled ? 'py-3' : 'pb-4 pt-3'}`}>
          <div className="relative">
            <Search
              className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-steel-600"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchChange}
              aria-label="Search listings"
              placeholder="Search cameras, tools, gear…"
              className="min-h-12 w-full rounded-door border-2 border-ink bg-panel pl-10 pr-3 text-body text-ink shadow-hard-sm transition-colors placeholder:text-steel-600 focus:border-violet"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
        {/* ================= SCREEN TITLE ================= */}
        <h1 className="font-display text-display-l uppercase text-ink">Explore</h1>
        <p className="mt-2 max-w-prose text-body text-steel-600">
          {firstName
            ? `Welcome back, ${firstName}. Everything below is ready to pick up from a locker near you.`
            : 'Everything below is ready to pick up from a locker near you.'}
        </p>

        {/* ================= PROFILE COMPLETION NUDGE ================= */}
        {profileIncomplete && (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-door border-2 border-ink bg-lilac-200 p-4 shadow-hard-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-door border-2 border-ink bg-panel text-violet">
                <UserCircle2 className="size-5" strokeWidth={2} aria-hidden="true" />
              </span>
              <div>
                <p className="text-title text-ink">Finish setting up your profile</p>
                <p className="text-small text-ink/70">
                  Renters trust completed profiles more. Add what's missing to keep using Lendrop.
                </p>
              </div>
            </div>
            <Button as={Link} to="/profile/edit" size="sm" variant="secondary">
              Complete profile
            </Button>
          </div>
        )}

        {/* ================= CATEGORIES ================= */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => {
            const active = selectedCategory === cat.slug
            const Icon = getCategoryIcon(cat.slug)
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                aria-pressed={active}
                className={`shrink-0 ${CHIP} ${active ? 'bg-lilac-200' : ''}`}
              >
                <Icon className="size-4" strokeWidth={2} aria-hidden="true" />
                {cat.name}
              </button>
            )
          })}
        </div>

        {/* ================= FILTERS ================= */}
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {cities.length > 1 && (
            <Select
              label="City"
              value={selectedCity ?? ''}
              onChange={(e) => setSelectedCity(e.target.value || null)}
              options={[
                { value: '', label: 'All cities' },
                ...cities.map((city) => ({ value: city, label: city })),
              ]}
              className="min-w-44"
            />
          )}

          <button
            type="button"
            onClick={() => setOnlyAvailable((prev) => !prev)}
            aria-pressed={onlyAvailable}
            className={`${CHIP} ${onlyAvailable ? 'bg-lilac-200' : ''}`}
          >
            <MapPin className="size-4" strokeWidth={2} aria-hidden="true" />
            {onlyAvailable ? 'Available now' : 'Showing all'}
          </button>

          {isFiltering && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        {/* ================= LISTINGS ================= */}
        <Plate
          title={sectionTitle}
          meta={itemsLoading ? 'LOADING' : `${filteredListings.length} SHOWN`}
          className="mt-8"
        />

        <div className="mt-6">
          {itemsError ? (
            <Toast tone="error" message={itemsError} />
          ) : itemsLoading ? (
            // Door-shaped skeletons in the real grid, so nothing jumps when the
            // listings land (sec. 7.12 + sec. 10 on layout shift).
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
              <Skeleton variant="door" count={8} />
            </div>
          ) : filteredListings.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
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
            <EmptyState
              title="Nothing matches that"
              body="Try a different search, or browse another category."
              action={
                isFiltering ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          )}
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t-[3px] border-ink bg-panel">
        <div className="mx-auto max-w-[1200px] px-4 py-12 md:px-8">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
              <p className="mt-3 max-w-40 text-small text-steel-600">
                Rent what you need, from people near you in El Salvador.
              </p>
              <a
                href="mailto:hola@lendrop.app"
                aria-label="Email Lendrop"
                className="mt-4 flex size-11 items-center justify-center rounded-door border-2 border-ink bg-panel text-ink press-sm"
              >
                <Mail className="size-4" strokeWidth={2} aria-hidden="true" />
              </a>
            </div>

            {[
              {
                title: 'Explore',
                links: [
                  { to: '/categories', label: 'Browse categories' },
                  { to: ROUTES.becomeLender, label: 'Become a Lender' },
                  { to: '/locker-coverage', label: 'Locker locations' },
                ],
              },
              {
                title: 'Support',
                links: [
                  { to: '/help', label: 'Help center' },
                  { to: '/history', label: 'Your activity' },
                ],
              },
              {
                title: 'Account',
                links: [
                  { to: ROUTES.profile, label: 'Your profile' },
                  { to: '/payment-methods', label: 'Payment methods' },
                  { to: '/verification', label: 'Verification' },
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <p className="font-mono text-label uppercase text-steel-600">{col.title}</p>
                <ul className="mt-1 text-body text-ink">
                  {col.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="flex min-h-11 min-w-11 items-center hover:text-violet hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 border-t-2 border-ink pt-6 text-small text-steel-600 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} Lendrop · San Salvador, El Salvador</span>
            <div className="flex items-center gap-4">
              <Link
                to="/settings"
                className="flex min-h-11 min-w-11 items-center hover:text-violet hover:underline"
              >
                Terms
              </Link>
              <Link
                to="/settings"
                className="flex min-h-11 min-w-11 items-center hover:text-violet hover:underline"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

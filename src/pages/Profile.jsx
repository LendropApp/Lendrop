import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Edit3,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  PackagePlus,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Truck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import MobileNav from '../components/MobileNav'
import { supabase } from '../lib/supabaseClient'
import LockerAvatar from '../components/LockerAvatar'
import StarRating from '../components/StarRating'
import ProfileCompletion from '../components/ProfileCompletion'
import LendropIdCard from '../components/LendropIdCard'
import useSmartBack from '../hooks/useSmartBack'
import Logo from '../components/Logo'

// The account hub, grouped by what you're doing: renting, hosting, or
// managing the account itself. Hosting links only show for hosts; other
// people get a single "Become a host" entry instead.
const RENTING = [
  { to: '/history', icon: Package, label: 'Activity', desc: 'Your rentals and cancellations' },
  { to: '/messages', icon: MessageCircle, label: 'Messages', desc: 'Talk to owners and renters' },
  { to: '/favorites', icon: Heart, label: 'Saved items', desc: 'Things you want to rent later' },
  { to: '/payment-methods', icon: CreditCard, label: 'Payment methods', desc: 'Manage saved cards' },
]

const HOSTING = [
  { to: '/my-listings', icon: Store, label: 'My listings', desc: 'Edit, pause or remove items' },
  { to: '/owner-delivery', icon: Truck, label: 'Drop-offs & returns', desc: 'Items to leave or collect at lockers' },
  { to: '/earnings-dashboard', icon: BarChart3, label: 'Lender statistics', desc: 'Earnings and payouts' },
  { to: '/publish', icon: PackagePlus, label: 'Publish an item', desc: 'List something new' },
]

const BECOME_HOST = [{ to: '/become-host', icon: Store, label: 'Become a host', desc: 'Earn from things you already own' }]

const ACCOUNT = [
  { to: '/verification', icon: ShieldCheck, label: 'Trust & verification', desc: 'Verify your identity' },
  { to: '/settings', icon: Settings, label: 'Settings', desc: 'Notifications, defaults, password, theme' },
  { to: '/premium', icon: Sparkles, label: 'Lendrop Premium', desc: 'No service fee for hosts', badge: 'Soon' },
  { to: '/help', icon: CircleHelp, label: 'Help center', desc: 'FAQ and contact' },
]

function MenuGroup({ title, items }) {
  return (
    <section aria-labelledby={`menu-${title}`}>
      <h2 id={`menu-${title}`} className="mb-3 text-lg font-extrabold">
        {title}
      </h2>
      <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
        {items.map(({ to, icon: Icon, label, desc, badge }, index) => (
          <li key={to} className={index > 0 ? 'border-t border-border' : ''}>
            <Link to={to} className="flex items-center gap-3 p-4 hover:bg-surface-raised">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text">{label}</span>
                  {badge && (
                    <span className="rounded-md bg-surface-raised px-2 py-0.5 text-xs font-semibold text-primary">
                      {badge}
                    </span>
                  )}
                </span>
                <span className="block text-xs text-text-muted">{desc}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function Profile() {
  const { user, profile, profileLoading, isHost, signOut } = useAuth()
  const navigate = useNavigate()
  const goBack = useSmartBack('/explore')

  const [itemsCount, setItemsCount] = useState(0)
  const [favoritesCount, setFavoritesCount] = useState(0)

  useEffect(() => {
    if (!user) return
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .then(({ count }) => setItemsCount(count ?? 0))

    supabase
      .from('favorites')
      .select('item_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .then(({ count }) => setFavoritesCount(count ?? 0))
  }, [user])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-muted">Loading profile…</p>
      </div>
    )
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'User'
  const reviewCount = profile?.total_reviews ?? 0
  const hasReviews = reviewCount > 0
  const verified = profile?.verification_status === 'verified'

  const stats = [
    { to: '/my-listings', icon: Store, value: itemsCount, label: itemsCount === 1 ? 'Item listed' : 'Items listed' },
    { to: '/favorites', icon: Heart, value: favoritesCount, label: 'Saved' },
    { to: '/history', icon: Star, value: reviewCount, label: reviewCount === 1 ? 'Review' : 'Reviews' },
  ]

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <header className="sticky top-0 z-50 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to Explore"
            className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Explore
          </button>
          <Logo />
          <MobileNav />
          <span className="hidden w-16 md:block" aria-hidden="true" />
        </div>
      </header>

      {/* ================= IDENTITY BAND ================= */}
      <section className="brand-field">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:px-10">
          <LockerAvatar label={firstName} photoUrl={profile?.avatar_url} verified={verified} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">{profile?.full_name || 'User'}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-soft-white/85">
              {profile?.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {profile.city}
                </span>
              )}
              {hasReviews ? (
                <span className="flex items-center gap-1.5">
                  <StarRating value={profile.average_rating} size="sm" />
                  <span className="font-semibold tabular-nums text-soft-white">
                    {Number(profile.average_rating).toFixed(1)}
                  </span>
                </span>
              ) : (
                <span>No reviews yet</span>
              )}
              {verified && (
                <span className="flex items-center gap-1 font-semibold text-soft-white">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Verified
                </span>
              )}
              {isHost && <span className="font-semibold text-soft-white">Host</span>}
            </div>
          </div>
          <Link
            to="/profile/edit"
            className="flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-white/40 px-4 py-2 text-sm font-semibold text-soft-white hover:border-white sm:self-center"
          >
            <Edit3 className="h-4 w-4" aria-hidden="true" />
            Edit profile
          </Link>
        </div>
        {profile?.bio && (
          <p className="mx-auto max-w-3xl px-6 pb-8 text-sm leading-relaxed text-soft-white/85 sm:px-10">{profile.bio}</p>
        )}
      </section>

      <div className="mx-auto max-w-3xl space-y-8 px-6 py-8 sm:px-10">
        {/* ================= STATS ================= */}
        <ul className="grid grid-cols-3 gap-3" aria-label="Your numbers">
          {stats.map(({ to, icon: Icon, value, label }) => (
            <li key={label}>
              <Link to={to} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="num mt-2 text-3xl text-text">{value}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </Link>
            </li>
          ))}
        </ul>

        {/* ================= LENDROP ID (private) ================= */}
        <LendropIdCard userId={user?.id} />

        {/* ================= COMPLETE YOUR PROFILE ================= */}
        <ProfileCompletion user={user} profile={profile} />

        {/* ================= MENU ================= */}
        <MenuGroup title="Renting" items={RENTING} />
        <MenuGroup title="Hosting" items={isHost ? HOSTING : BECOME_HOST} />
        <MenuGroup title="Account" items={ACCOUNT} />

        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface py-3 text-sm font-semibold text-danger hover:bg-danger-soft"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  )
}

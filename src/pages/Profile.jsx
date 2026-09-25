import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  CreditCard,
  Edit3,
  Heart,
  LogOut,
  MapPin,
  MessageCircle,
  Package,
  Settings,
  ShieldCheck,
  Sparkles,
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

const ACCOUNT_MENU = [
  { to: '/messages', icon: MessageCircle, label: 'Messages', desc: 'Coordinate pickups and drop offs' },
  { to: '/history', icon: Package, label: 'Activity', desc: 'Your rentals and lendings history' },
  { to: '/verification', icon: ShieldCheck, label: 'Trust & verification', desc: 'Verify your identity' },
  { to: '/payment-methods', icon: CreditCard, label: 'Payment methods', desc: 'Manage saved cards' },
  { to: '/earnings-dashboard', icon: BarChart3, label: 'Lender statistics', desc: 'Earnings and ratings' },
  { to: '/premium', icon: Sparkles, label: 'Lendrop Premium', desc: 'Coming soon', badge: 'Soon' },
  { to: '/settings', icon: Settings, label: 'Settings', desc: 'Notifications, browsing defaults, password' },
]

export default function Profile() {
  const { user, profile, profileLoading, signOut } = useAuth()
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
  const hasReviews = (profile?.total_reviews ?? 0) > 0

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <header className="glass sticky top-0 z-50">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-4 sm:px-10">
          <button
            type="button"
            onClick={goBack}
            aria-label="Back to Explore"
            className="flex items-center gap-2 text-sm font-medium text-text-muted transition hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </button>
          <Logo />
          <div className="flex items-center gap-2">
            <MobileNav />
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Log out"
              className="hidden items-center gap-1.5 text-sm font-medium text-text-muted transition hover:text-red-500 md:flex"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="relative isolate overflow-hidden">
        <div className="relative mx-auto max-w-3xl space-y-6 px-6 py-8 sm:px-10">
          {/* ================= PROFILE CARD ================= */}
          <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
              <LockerAvatar
                label={firstName}
                photoUrl={profile?.avatar_url}
                verified={profile?.verification_status === 'verified'}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h1 className="font-display text-xl font-bold text-text">
                      {profile?.full_name || 'User'}
                    </h1>
                    {profile?.city && (
                      <div className="mt-1 flex items-center justify-center gap-1.5 text-sm text-text-muted sm:justify-start">
                        <MapPin className="h-3.5 w-3.5" />
                        {profile.city}
                      </div>
                    )}
                  </div>
                  <Link
                    to="/profile/edit"
                    className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-2 text-xs font-semibold text-text-muted transition hover:border-primary hover:text-primary"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit profile
                  </Link>
                </div>

                <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
                  {hasReviews ? (
                    <>
                      <StarRating value={profile.average_rating} size="sm" />
                      <span className="font-mono text-sm font-medium text-text">
                        {Number(profile.average_rating).toFixed(1)}
                      </span>
                      <span className="text-sm text-text-muted">
                        ({profile.total_reviews} reviews)
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-text-muted">No reviews yet</span>
                  )}
                  {profile?.verification_status === 'verified' && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {profile?.bio && (
              <p className="mt-5 border-t border-border pt-5 text-sm leading-6 text-text-muted">
                {profile.bio}
              </p>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5">
              <Link
                to="/explore"
                className="flex items-center gap-3 rounded-xl bg-surface-raised p-3.5 transition hover:bg-surface-raised"
              >
                <Package className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-text">{itemsCount}</p>
                  <p className="text-xs text-text-muted">Items listed</p>
                </div>
              </Link>
              <Link
                to="/favorites"
                className="flex items-center gap-3 rounded-xl bg-surface-raised p-3.5 transition hover:bg-surface-raised"
              >
                <Heart className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-text">{favoritesCount}</p>
                  <p className="text-xs text-text-muted">Saved items</p>
                </div>
              </Link>
            </div>
          </section>

          {/* ================= LENDROP ID (private) ================= */}
          <LendropIdCard userId={user?.id} />

          {/* ================= COMPLETE YOUR PROFILE ================= */}
          <ProfileCompletion user={user} profile={profile} />

          {/* ================= ACCOUNT MENU ================= */}
          <section className="overflow-hidden rounded-2xl border border-border bg-surface">
            {ACCOUNT_MENU.map(({ to, icon: Icon, label, desc, badge }, index) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 p-4 transition hover:bg-surface-raised ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-text">{label}</p>
                    {badge && (
                      <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">{desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
              </Link>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}

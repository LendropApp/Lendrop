import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { BECOME_HOST_CTA, buildNavSections } from '../lib/navigation'
import { describeVerification } from '../lib/verification'
import LockerAvatar from './LockerAvatar'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

const VERIFICATION_PLATE = {
  verified: 'bg-go',
  pending: 'bg-signal',
  rejected: 'bg-alert-700 text-panel',
  unverified: 'bg-steel-300',
}

/**
 * The mobile navigation drawer — every destination in the app, grouped
 * by role (see buildNavSections). Shown below lg, where the page header's
 * own inline nav takes over: at md the header row (logo, five chips, the
 * become-a-lender CTA, avatar and menu) no longer fits without overflowing
 * the viewport, so the handover happens at lg instead.
 *
 * Renders nothing for signed-out visitors, which is why pages can drop
 * it into a header unconditionally.
 */
export default function MobileNav() {
  const { user, isHost, profile, verificationStatus, signOut } = useAuth()
  const location = useLocation()

  const [open, setOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const panelRef = useRef(null)

  // Navigating away closes the drawer — otherwise it would still be
  // sitting open on top of the page the user just picked.
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!user || !open) return
    let cancelled = false
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .then(({ count }) => {
        if (!cancelled) setUnreadNotifications(count ?? 0)
      })
    return () => {
      cancelled = true
    }
  }, [user, open])

  // Escape to close, Tab cycling kept inside the panel, background
  // scroll locked, and focus handed back to the hamburger on close.
  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    const previouslyFocused = document.activeElement

    function focusables() {
      return Array.from(panel?.querySelectorAll(FOCUSABLE) ?? [])
    }

    focusables()[0]?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        return
      }
      if (event.key !== 'Tab') return

      const list = focusables()
      if (list.length === 0) return

      const first = list[0]
      const last = list[list.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open])

  if (!user) return null

  const sections = buildNavSections({ isHost, isAdmin: Boolean(profile?.is_admin) })
  const firstName = profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0]
  const verification = describeVerification(verificationStatus)
  const BecomeHostIcon = BECOME_HOST_CTA.icon

  function badgeFor(kind) {
    if (kind === 'notifications' && unreadNotifications > 0) {
      return (
        <span className="ml-auto min-w-5 rounded-tag border-2 border-ink bg-lilac px-1.5 py-0.5 text-center font-mono text-label text-ink">
          {unreadNotifications > 9 ? '9+' : unreadNotifications}
        </span>
      )
    }
    if (kind === 'verification' && verificationStatus !== 'verified') {
      return (
        <span
          className={`ml-auto rounded-tag border-2 border-ink px-2 py-0.5 font-mono text-label uppercase text-ink ${VERIFICATION_PLATE[verificationStatus] ?? VERIFICATION_PLATE.unverified}`}
        >
          {verification.label}
        </span>
      )
    }
    return null
  }

  // Portalled to <body> on purpose. This started as a workaround for the
  // .glass header, whose backdrop-filter made the header a containing block
  // for fixed-position descendants and clipped the overlay to its box. The
  // redesign dropped backdrop-filter, but the portal stays: the header is
  // still sticky and still establishes a stacking context, so an overlay
  // rendered inside it would sit under the page rather than over it.
  const drawer = (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="absolute inset-0 size-full cursor-default bg-night/60"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="anim-sheet absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto border-l-[3px] border-ink bg-panel"
      >
        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
          <Link
            to="/profile"
            className="flex min-w-0 items-center gap-3 rounded-door p-1 transition-colors hover:bg-lilac-200"
          >
            <LockerAvatar
              label={firstName}
              photoUrl={profile?.avatar_url}
              verified={verificationStatus === 'verified'}
              size="md"
            />
            <span className="min-w-0">
              <span className="block truncate text-title text-ink">
                {profile?.full_name ?? firstName}
              </span>
              <span className="block font-mono text-label uppercase text-steel-600">
                {isHost ? 'Lender & renter' : 'Renter'}
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex size-11 shrink-0 items-center justify-center rounded-door border-2 border-ink bg-panel text-ink press-sm"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        {!isHost && (
          <div className="px-5 pb-2">
            <Link
              to={BECOME_HOST_CTA.to}
              className="flex min-h-12 items-center justify-center gap-2 rounded-door border-[3px] border-ink bg-violet px-4 text-body font-bold text-panel press-md"
            >
              <BecomeHostIcon className="size-4" strokeWidth={2} aria-hidden="true" />
              {BECOME_HOST_CTA.label}
            </Link>
          </div>
        )}

        <nav className="flex-1 px-2 pb-4">
          {sections.map((section) => (
            <div key={section.id} className="mt-4 first:mt-2">
              <p className="mx-3 border-b-2 border-ink pb-1 font-mono text-label uppercase text-steel-600">
                {section.title}
              </p>
              <ul>
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex min-h-11 items-center gap-3 rounded-door px-3 py-2.5 text-body font-medium transition-colors ${
                            isActive
                              ? 'bg-lilac-200 text-violet'
                              : 'text-ink hover:bg-lilac-200'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              strokeWidth={2}
                              aria-hidden="true"
                              className={`size-4 shrink-0 ${isActive ? 'text-violet' : 'text-steel-600'}`}
                            />
                            <span className="truncate">{item.label}</span>
                            {badgeFor(item.badge)}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t-2 border-ink px-2 py-3">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="flex min-h-11 w-full items-center gap-3 rounded-door px-3 py-2.5 text-body font-medium text-alert transition-colors hover:bg-lilac-200"
          >
            <LogOut className="size-4" strokeWidth={2} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex size-11 items-center justify-center rounded-door border-2 border-ink bg-panel text-ink press-sm"
      >
        <Menu className="size-4" strokeWidth={2} aria-hidden="true" />
      </button>

      {open && createPortal(drawer, document.body)}
    </div>
  )
}

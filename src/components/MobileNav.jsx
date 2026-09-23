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

const VERIFICATION_PILL = {
  verified: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  unverified: 'bg-jet-black/10 text-text-muted',
}

/**
 * The mobile navigation drawer — every destination in the app, grouped
 * by role (see buildNavSections). Mobile only: on md and up the page's
 * own header keeps its inline nav, so this whole component is hidden.
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
        <span className="ml-auto min-w-5 rounded-full bg-lavender px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold text-jet-black">
          {unreadNotifications > 9 ? '9+' : unreadNotifications}
        </span>
      )
    }
    if (kind === 'verification' && verificationStatus !== 'verified') {
      return (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${VERIFICATION_PILL[verificationStatus] ?? VERIFICATION_PILL.unverified}`}
        >
          {verification.label}
        </span>
      )
    }
    return null
  }

  // Portalled to <body> on purpose: every app header carries the .glass
  // class, whose backdrop-filter makes the header a containing block for
  // fixed-position descendants. Rendered in place, the overlay gets
  // clipped to the header's box instead of covering the screen.
  const drawer = (
    <div className="fixed inset-0 z-[60] md:hidden">
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="absolute inset-0 h-full w-full cursor-default bg-jet-black/40 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="absolute inset-y-0 right-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-bg shadow-[0_0_60px_-12px_rgba(13,13,13,0.45)]"
      >
        <div className="h-px shrink-0 bg-linear-to-r from-transparent via-lavender to-transparent" />

        <div className="flex items-start justify-between gap-3 px-5 pb-4 pt-5">
          <Link
            to="/profile"
            className="flex min-w-0 items-center gap-3 rounded-2xl p-1 transition hover:bg-surface-raised"
          >
            <LockerAvatar
              label={firstName}
              photoUrl={profile?.avatar_url}
              verified={verificationStatus === 'verified'}
              size="md"
            />
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold text-text">
                {profile?.full_name ?? firstName}
              </span>
              <span className="block font-mono text-[10px] uppercase tracking-widest text-primary">
                {isHost ? 'Lender & renter' : 'Renter'}
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-text-muted transition hover:border-primary hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!isHost && (
          <div className="px-5 pb-2">
            <Link
              to={BECOME_HOST_CTA.to}
              className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-deep-purple to-lavender px-4 py-2.5 text-sm font-semibold text-soft-white glow-sm transition hover:brightness-105"
            >
              <BecomeHostIcon className="h-4 w-4" />
              {BECOME_HOST_CTA.label}
            </Link>
          </div>
        )}

        <nav className="flex-1 px-2 pb-4">
          {sections.map((section) => (
            <div key={section.id} className="mt-4 first:mt-2">
              <p className="px-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted">
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
                          `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? 'bg-surface-raised text-primary'
                              : 'text-text hover:bg-surface-raised hover:text-primary'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon
                              className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted'}`}
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

        <div className="border-t border-border px-2 py-3">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-muted transition hover:border-primary hover:text-primary"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && createPortal(drawer, document.body)}
    </div>
  )
}

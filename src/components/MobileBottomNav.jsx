import { useLocation, useNavigate } from 'react-router-dom'
import { Plus, ShieldAlert, UserCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Routes where a signed-in user shouldn't see the bar: the marketing
// landing page and the auth screens, which have their own chrome.
const HIDDEN_ON = ['/', '/login', '/signup', '/forgot-password', '/reset-password']

/**
 * The mobile bottom bar. Deliberately just two actions — Publish and
 * Profile. Everything else reachable in the app lives in MobileNav's
 * drawer, so no destination appears in both places.
 *
 * Mounted once in App.jsx rather than per page, and hidden on md and up
 * where the header nav takes over.
 */
export default function MobileBottomNav() {
  const { user, isHost, isVerified } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (!user || HIDDEN_ON.includes(location.pathname)) return null

  // Publishing needs a host profile AND a verified identity (migration
  // 0019). HostRoute/VerifiedRoute would redirect anyway, but sending
  // the user straight to the step they're missing — with the reason
  // attached — beats a redirect bounce they can't explain.
  const blocked = !isHost || !isVerified

  function handlePublish() {
    if (!isHost) {
      navigate('/become-host')
      return
    }
    if (!isVerified) {
      navigate('/verification', { state: { reason: 'publish' } })
      return
    }
    navigate('/publish')
  }

  const isPublishActive = location.pathname === '/publish'
  const isProfileActive = location.pathname.startsWith('/profile')

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="grid grid-cols-2">
        <button
          type="button"
          onClick={handlePublish}
          aria-label={
            blocked ? 'Publish an item — identity verification required' : 'Publish an item'
          }
          aria-current={isPublishActive ? 'page' : undefined}
          className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
            isPublishActive ? 'text-primary' : 'text-text-muted hover:text-primary'
          }`}
        >
          <span className="relative">
            <Plus className="h-5 w-5" />
            {blocked && (
              <ShieldAlert className="absolute -right-2 -top-1 h-3 w-3 text-danger" />
            )}
          </span>
          Publish
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Your profile"
          aria-current={isProfileActive ? 'page' : undefined}
          className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${
            isProfileActive ? 'text-primary' : 'text-text-muted hover:text-primary'
          }`}
        >
          <UserCircle2 className="h-5 w-5" />
          Profile
        </button>
      </div>
    </nav>
  )
}

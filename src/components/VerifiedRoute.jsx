import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Gates screens that write something the server will reject from an
// unverified account (today: /publish). Unauthenticated users go to
// /login like ProtectedRoute; verified-pending/rejected/unverified users
// land on /verification, which reads location.state.reason to explain
// which action sent them there instead of showing a bare status page.
//
// This is UX, not security — the actual rule is RLS + the reservation
// RPCs (migration 0019). Deleting this component would not let anyone
// publish.
export default function VerifiedRoute({ children, reason = 'publish' }) {
  const { isAuthenticated, loading, profileLoading, isVerified } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isVerified) {
    return <Navigate to="/verification" state={{ reason, from: location }} replace />
  }

  return children
}

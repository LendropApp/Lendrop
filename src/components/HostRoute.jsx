import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Gates lender-only screens (e.g. /publish). Unauthenticated users go to
// /login like ProtectedRoute; authenticated non-hosts go to /become-host
// to run the onboarding wizard instead of hitting a broken/empty screen.
export default function HostRoute({ children }) {
  const { isAuthenticated, loading, profileLoading, isHost } = useAuth()
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

  if (!isHost) {
    return <Navigate to="/become-host" state={{ from: location }} replace />
  }

  return children
}

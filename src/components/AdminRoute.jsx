import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Gates the admin monitoring panel. Unauthenticated users go to /login
// like ProtectedRoute; authenticated non-admins are bounced to /explore
// rather than seeing a blocked/empty screen.
export default function AdminRoute({ children }) {
  const { isAuthenticated, loading, profileLoading, profile } = useAuth()
  const location = useLocation()

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-white">
        <p className="font-body text-sm text-jet-black/60">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!profile?.is_admin) {
    return <Navigate to="/explore" replace />
  }

  return children
}

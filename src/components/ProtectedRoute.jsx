import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-white">
        <p className="font-body text-sm text-jet-black/60">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

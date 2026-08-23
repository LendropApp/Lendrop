import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


export default function Dashboard() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-soft-white px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="font-display text-xl font-semibold text-deep-purple">
            Lendrop
          </Link>
          <button
            onClick={signOut}
            className="rounded-lg border border-jet-black/10 px-4 py-2 text-sm font-medium hover:bg-jet-black/5"
          >
            Log out
          </button>
        </div>

        <div className="rounded-2xl border border-jet-black/10 bg-white p-6">
          <p className="text-sm text-jet-black/60">Signed in as</p>
          <p className="font-mono text-sm">{user?.email}</p>
        </div>
      </div>
    </div>
  )
}

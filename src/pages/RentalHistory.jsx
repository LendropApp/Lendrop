import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import EmptyState from '../components/EmptyState'

const STATUS_STYLES = {
  completed: 'bg-lavender/15 text-deep-purple',
  cancelled: 'bg-jet-black/10 text-jet-black/50',
  disputed: 'bg-red-500/10 text-red-500',
}

const STATUS_LABELS = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'In dispute',
}

// Mock data — TODO: Supabase, traer historial real del usuario
const RENTED_BY_ME = [
  {
    id: 1,
    title: 'Cordless drill, Bosch',
    otherParty: 'M. García',
    startDate: '2026-08-12',
    endDate: '2026-08-14',
    price: 15,
    status: 'completed',
  },
  {
    id: 2,
    title: 'Trek mountain bike',
    otherParty: 'C. Turcios',
    startDate: '2026-08-20',
    endDate: '2026-08-22',
    price: 20,
    status: 'disputed',
  },
]

const LENT_BY_ME = [
  {
    id: 3,
    title: 'Canon EOS R6 camera',
    otherParty: 'A. Molina',
    startDate: '2026-07-01',
    endDate: '2026-07-03',
    price: 35,
    status: 'completed',
  },
  {
    id: 4,
    title: 'Full golf set',
    otherParty: 'R. Hernández',
    startDate: '2026-07-15',
    endDate: '2026-07-16',
    price: 18,
    status: 'cancelled',
  },
]

export default function RentalHistory() {
  const { user } = useAuth()
  const [tab, setTab] = useState('rented') // 'rented' | 'lent'

  const list = tab === 'rented' ? RENTED_BY_ME : LENT_BY_ME

  return (
    <div className="min-h-screen bg-soft-white">
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4 sm:px-10">
          <Link to="/" className="shrink-0">
            <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
          </Link>

          <Link
            to="/dashboard"
            aria-label="Your account"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-jet-black/10 text-jet-black/60 transition hover:border-lavender hover:text-deep-purple"
          >
            <User className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* ================= TITLE + TABS ================= */}
      <section className="mx-auto max-w-6xl px-6 pt-10 sm:px-10">
        <h1 className="font-display text-2xl font-bold text-jet-black sm:text-3xl">
          Rental history
        </h1>
        <p className="mt-1 text-sm text-jet-black/50">
          Everything you've rented and everything you've lent out.
        </p>

        <div className="mt-6 flex gap-6 border-b border-jet-black/5">
          <button
            type="button"
            onClick={() => setTab('rented')}
            className={`border-b-2 pb-3 text-sm font-medium transition ${
              tab === 'rented'
                ? 'border-jet-black text-jet-black'
                : 'border-transparent text-jet-black/40 hover:text-jet-black/70'
            }`}
          >
            What I rented
          </button>
          <button
            type="button"
            onClick={() => setTab('lent')}
            className={`border-b-2 pb-3 text-sm font-medium transition ${
              tab === 'lent'
                ? 'border-jet-black text-jet-black'
                : 'border-transparent text-jet-black/40 hover:text-jet-black/70'
            }`}
          >
            What I lent
          </button>
        </div>
      </section>

      {/* ================= LIST ================= */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        {list.length > 0 ? (
          <div className="flex flex-col gap-4">
            {list.map((item) => (
              <RentalCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title={tab === 'rented' ? 'No rentals yet' : 'Nothing lent out yet'}
            description={
              tab === 'rented'
                ? "You haven't rented anything yet. Explore what's available near you."
                : "You haven't lent anything yet. List an item to get started."
            }
            action={{
              label: 'Explore',
              onClick: () => {}, // TODO: navegar a /explore
            }}
          />
        )}
      </section>
    </div>
  )
}

function RentalCard({ item }) {
  return (
    <article className="flex items-center justify-between gap-4 rounded-2xl border border-jet-black/5 bg-white px-5 py-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-jet-black">{item.title}</p>
        <p className="mt-1 text-xs text-jet-black/50">
          {item.otherParty} · {item.startDate} → {item.endDate}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="font-mono text-sm font-semibold text-jet-black">
          ${item.price}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLES[item.status]}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>
    </article>
  )
}
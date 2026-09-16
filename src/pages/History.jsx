import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

// Mock-data-first, shaped like a join of reservations + payments + items
// so it's a straight swap to a real Supabase query later.
const MOCK_RENTALS = [
  {
    id: 'r1',
    itemTitle: 'LEGO Millennium Falcon',
    counterparty: 'Karla Rivas',
    startDate: '2026-09-10',
    endDate: '2026-09-14',
    totalPrice: 45.0,
    status: 'active',
  },
  {
    id: 'r2',
    itemTitle: 'Canon EOS R50',
    counterparty: 'Diego Hernández',
    startDate: '2026-08-20',
    endDate: '2026-08-23',
    totalPrice: 60.0,
    status: 'completed',
  },
  {
    id: 'r3',
    itemTitle: 'Camping tent 4p',
    counterparty: 'Andrea Portillo',
    startDate: '2026-07-02',
    endDate: '2026-07-05',
    totalPrice: 22.5,
    status: 'cancelled',
  },
]

const MOCK_LENDINGS = [
  {
    id: 'l1',
    itemTitle: 'DJI Mini 4 Pro',
    counterparty: 'Andrea Portillo',
    startDate: '2026-09-12',
    endDate: '2026-09-15',
    totalPrice: 32.5,
    status: 'active',
  },
  {
    id: 'l2',
    itemTitle: 'LEGO Technic Ferrari',
    counterparty: 'Karla Rivas',
    startDate: '2026-08-01',
    endDate: '2026-08-03',
    totalPrice: 28.0,
    status: 'completed',
  },
  {
    id: 'l3',
    itemTitle: 'LEGO Star Destroyer',
    counterparty: 'Diego Hernández',
    startDate: '2026-07-15',
    endDate: '2026-07-18',
    totalPrice: 28.0,
    status: 'disputed',
  },
]

const STATUS_STYLES = {
  active: 'bg-lavender/15 text-deep-purple',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-jet-black/10 text-jet-black/50',
  disputed: 'bg-red-100 text-red-600',
}

const STATUS_LABELS = {
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'In dispute',
}

function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString([], opts)} – ${new Date(end).toLocaleDateString([], opts)}`
}

export default function History() {
  const [tab, setTab] = useState('rentals')
  const rows = tab === 'rentals' ? MOCK_RENTALS : MOCK_LENDINGS

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-jet-black">Activity</h1>
          <p className="mt-1 text-sm text-jet-black/50">
            Every rental and lending transaction in one place.
          </p>

          <div className="mt-6 flex gap-2 rounded-full bg-jet-black/5 p-1">
            {[
              { id: 'rentals', label: 'As renter' },
              { id: 'lendings', label: 'As lender' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                  tab === t.id ? 'bg-white text-deep-purple shadow-sm' : 'text-jet-black/50 hover:text-jet-black'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {rows.length > 0 ? (
            <div className="mt-6 space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-lavender/15 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-jet-black">{row.itemTitle}</p>
                      <p className="text-xs text-jet-black/45">
                        {tab === 'rentals' ? 'Lent by' : 'Rented by'} {row.counterparty}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-jet-black/5 pt-3">
                    <span className="text-xs text-jet-black/50">{formatDateRange(row.startDate, row.endDate)}</span>
                    <span className="font-mono text-sm font-semibold text-jet-black">
                      ${row.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-16 flex flex-col items-center gap-2 text-center">
              <Clock className="h-8 w-8 text-jet-black/20" />
              <p className="font-display text-lg font-semibold text-jet-black">Nothing here yet</p>
              <p className="text-sm text-jet-black/50">
                Your {tab === 'rentals' ? 'reservations' : 'listings activity'} will show up here.
              </p>
              <Link to="/explore" className="mt-2 text-sm font-semibold text-deep-purple hover:text-lavender">
                Browse Explore
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

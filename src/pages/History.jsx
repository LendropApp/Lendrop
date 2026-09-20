import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

const STATUS_STYLES = {
  pending: 'bg-jet-black/10 text-jet-black/60',
  confirmed: 'bg-lavender/15 text-deep-purple',
  active: 'bg-lavender/15 text-deep-purple',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-jet-black/10 text-jet-black/50',
  disputed: 'bg-red-100 text-red-600',
}

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'In dispute',
}

function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString([], opts)} – ${new Date(end).toLocaleDateString([], opts)}`
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function History() {
  const { user } = useAuth()
  const [tab, setTab] = useState('rentals')
  const [rentals, setRentals] = useState([])
  const [lendings, setLendings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmCancelId, setConfirmCancelId] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase
        .from('reservations')
        .select(
          `id, start_date, end_date, status, total_price,
           item:items(title, owner:profiles!items_owner_id_fkey(full_name))`
        )
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reservations')
        .select(
          `id, start_date, end_date, status, total_price,
           item:items!inner(title, owner_id),
           renter:profiles!reservations_renter_id_fkey(full_name)`
        )
        .eq('item.owner_id', user.id)
        .order('created_at', { ascending: false }),
    ]).then(([rentalsRes, lendingsRes]) => {
      if (cancelled) return
      if (rentalsRes.error || lendingsRes.error) {
        setError('Could not load your activity. Please refresh.')
      } else {
        setRentals(
          (rentalsRes.data ?? []).map((r) => ({
            id: r.id,
            itemTitle: r.item?.title ?? 'Item',
            counterparty: r.item?.owner?.full_name ?? 'Lender',
            startDate: r.start_date,
            endDate: r.end_date,
            totalPrice: Number(r.total_price),
            status: r.status,
          }))
        )
        setLendings(
          (lendingsRes.data ?? []).map((r) => ({
            id: r.id,
            itemTitle: r.item?.title ?? 'Item',
            counterparty: r.renter?.full_name ?? 'Renter',
            startDate: r.start_date,
            endDate: r.end_date,
            totalPrice: Number(r.total_price),
            status: r.status,
          }))
        )
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  const rows = tab === 'rentals' ? rentals : lendings
  const todayIso = toISODate(new Date())

  function canCancel(row) {
    return tab === 'rentals' && (row.status === 'pending' || row.status === 'confirmed') && row.startDate >= todayIso
  }

  async function handleConfirmCancel(id) {
    setCancelling(true)
    const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id)
    setCancelling(false)
    if (error) return
    setRentals((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)))
    setConfirmCancelId(null)
  }

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

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="mt-8 text-center text-sm text-jet-black/40">Loading activity…</p>
          ) : rows.length > 0 ? (
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

                  {row.status === 'confirmed' && (
                    <div className="mt-3 border-t border-jet-black/5 pt-3">
                      <Link
                        to={tab === 'rentals' ? `/rental-tracking?reservationId=${row.id}` : `/owner-delivery?reservationId=${row.id}`}
                        className="text-xs font-semibold text-deep-purple hover:text-lavender"
                      >
                        {tab === 'rentals' ? 'Track pickup →' : 'Deliver item →'}
                      </Link>
                    </div>
                  )}

                  {canCancel(row) && (
                    <div className="mt-3 border-t border-jet-black/5 pt-3">
                      {confirmCancelId === row.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="mr-auto text-xs text-jet-black/60">Cancel this reservation?</span>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            disabled={cancelling}
                            className="rounded-full border border-jet-black/10 px-3 py-1 text-xs font-semibold text-jet-black/70 hover:bg-jet-black/5"
                          >
                            Keep it
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmCancel(row.id)}
                            disabled={cancelling}
                            className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                          >
                            {cancelling ? 'Cancelling…' : 'Confirm cancel'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(row.id)}
                          className="text-xs font-semibold text-red-500 hover:text-red-600"
                        >
                          Cancel reservation
                        </button>
                      )}
                    </div>
                  )}
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

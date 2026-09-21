import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

const RESERVATION_STATUS_STYLES = {
  pending: 'bg-jet-black/10 text-jet-black/60',
  confirmed: 'bg-lavender/15 text-deep-purple',
  active: 'bg-lavender/15 text-deep-purple',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-jet-black/10 text-jet-black/50',
  disputed: 'bg-red-100 text-red-600',
}

const RESERVATION_STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'In dispute',
}

const PAYMENT_STATUS_STYLES = {
  pending: 'bg-jet-black/10 text-jet-black/60',
  authorized: 'bg-lavender/15 text-deep-purple',
  paid: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-jet-black/10 text-jet-black/50',
  failed: 'bg-red-100 text-red-600',
}

const COMPARTMENT_STATUS_STYLES = {
  available: 'bg-emerald-100 text-emerald-700',
  reserved: 'bg-lavender/15 text-deep-purple',
  occupied: 'bg-amber-100 text-amber-700',
  maintenance: 'bg-red-100 text-red-600',
}

function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString([], opts)} – ${new Date(end).toLocaleDateString([], opts)}`
}

export default function Admin() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from('reservations')
      .select(
        `id, status, start_date, end_date, total_price, created_at,
         item:items(title, owner:profiles!items_owner_id_fkey(full_name)),
         renter:profiles!reservations_renter_id_fkey(full_name),
         payments(status),
         compartment:locker_compartments(compartment_code, status, locker:lockers(name))`
      )
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Could not load reservations. Please refresh.')
        else setRows(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-soft-white pb-28 md:pb-16">
      <PageHeader backTo="/explore" backLabel="Back to Explore" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-6xl px-6 py-8 sm:px-10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-deep-purple" />
            <h1 className="font-display text-2xl font-bold text-jet-black">Admin</h1>
          </div>
          <p className="mt-1 text-sm text-jet-black/50">
            Every reservation, with its locker and payment status, in one place.
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="mt-8 text-center text-sm text-jet-black/40">Loading reservations…</p>
          ) : rows.length === 0 ? (
            <p className="mt-8 text-center text-sm text-jet-black/40">No reservations yet.</p>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-lavender/15 bg-white">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr className="border-b border-jet-black/5 text-xs font-semibold uppercase tracking-wide text-jet-black/40">
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Renter</th>
                    <th className="px-4 py-3">Lender</th>
                    <th className="px-4 py-3">Dates</th>
                    <th className="px-4 py-3">Reservation</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Locker</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const paymentStatus = row.payments?.[0]?.status ?? null
                    const compartment = row.compartment
                    return (
                      <tr key={row.id} className="border-b border-jet-black/5 last:border-0">
                        <td className="max-w-[200px] truncate px-4 py-3 font-medium text-jet-black">
                          {row.item?.title ?? 'Item'}
                        </td>
                        <td className="px-4 py-3 text-jet-black/70">{row.renter?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-jet-black/70">{row.item?.owner?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-jet-black/60">
                          {formatDateRange(row.start_date, row.end_date)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              RESERVATION_STATUS_STYLES[row.status] ?? 'bg-jet-black/10 text-jet-black/60'
                            }`}
                          >
                            {RESERVATION_STATUS_LABELS[row.status] ?? row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {paymentStatus ? (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                PAYMENT_STATUS_STYLES[paymentStatus] ?? 'bg-jet-black/10 text-jet-black/60'
                              }`}
                            >
                              {paymentStatus}
                            </span>
                          ) : (
                            <span className="text-xs text-jet-black/35">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {compartment ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  COMPARTMENT_STATUS_STYLES[compartment.status] ?? 'bg-jet-black/10 text-jet-black/60'
                                }`}
                              >
                                {compartment.status}
                              </span>
                              <span className="text-xs text-jet-black/45">
                                {compartment.locker?.name} · {compartment.compartment_code}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-jet-black/35">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm font-semibold text-jet-black">
                          ${Number(row.total_price).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

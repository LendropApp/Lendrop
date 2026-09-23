import { useEffect, useMemo, useState } from 'react'
import { CheckCircle, Clock, DollarSign, Package, Star, TrendingUp, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

const PAYMENT_STATUS_META = {
  paid: { label: 'Completed', icon: CheckCircle, className: 'bg-emerald-100 text-emerald-700' },
  authorized: { label: 'Pending release', icon: Clock, className: 'bg-surface-raised text-primary' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-surface-raised text-primary' },
  refunded: { label: 'Refunded', icon: XCircle, className: 'bg-jet-black/10 text-text-muted' },
  failed: { label: 'Failed', icon: XCircle, className: 'bg-red-100 text-red-600' },
}

function formatMoney(amount) {
  return `$${Number(amount ?? 0).toFixed(2)}`
}

export default function EarningsDashboard() {
  const { user, profile } = useAuth()

  const [payments, setPayments] = useState([])
  const [completedRentals, setCompletedRentals] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase
        .from('payments')
        .select(
          `id, amount, status, paid_at, created_at,
           reservation:reservations!inner(id, status, item:items!inner(id, title, owner_id))`
        )
        .eq('reservation.item.owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reservations')
        .select('id, status, item:items!inner(owner_id)')
        .eq('item.owner_id', user.id)
        .eq('status', 'completed'),
    ]).then(([paymentsRes, reservationsRes]) => {
      if (cancelled) return
      if (paymentsRes.error || reservationsRes.error) {
        setError('Could not load your earnings. Please refresh.')
      } else {
        setPayments(paymentsRes.data ?? [])
        setCompletedRentals(reservationsRes.data?.length ?? 0)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  const stats = useMemo(() => {
    const totalEarnings = payments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0)
    const pendingRelease = payments
      .filter((p) => p.status === 'authorized' || p.status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const now = new Date()
    const monthlyEarnings = payments
      .filter((p) => {
        if (p.status !== 'paid' || !p.paid_at) return false
        const paidAt = new Date(p.paid_at)
        return paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear()
      })
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const nextPayout = payments.find((p) => p.status === 'authorized' || p.status === 'pending')

    return { totalEarnings, pendingRelease, monthlyEarnings, nextPayout }
  }, [payments])

  const hasReviews = (profile?.total_reviews ?? 0) > 0

  const STATS = [
    { icon: DollarSign, label: 'Total earnings', value: formatMoney(stats.totalEarnings), hint: 'From completed payments' },
    { icon: Clock, label: 'Pending release', value: formatMoney(stats.pendingRelease), hint: 'Waiting for deposit release' },
    { icon: Package, label: 'Rentals completed', value: String(completedRentals), hint: 'Successfully completed' },
    {
      icon: Star,
      label: 'Average rating',
      value: hasReviews ? Number(profile.average_rating).toFixed(1) : 'N/A',
      hint: hasReviews ? `From ${profile.total_reviews} reviews` : 'No reviews yet',
    },
  ]

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" maxWidth="max-w-5xl" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-5xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Lender statistics</h1>
          <p className="mt-1 text-sm text-text-muted">
            Track your rental earnings, ratings, and pending payouts.
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="mt-8 text-center text-sm text-text-muted">Loading your stats…</p>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STATS.map(({ icon: Icon, label, value, hint }) => (
                  <div key={label} className="rounded-2xl border border-border bg-surface p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-muted">{label}</p>
                      <Icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <p className="mt-3 font-mono text-2xl font-bold text-primary">{value}</p>
                    <p className="mt-1 text-xs text-text-muted">{hint}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" />
                  <h2 className="font-display text-lg font-semibold text-text">Earnings overview</h2>
                </div>
                <div className="flex h-48 items-center justify-center rounded-2xl cta-brand">
                  <div className="text-center text-white">
                    <p className="font-display text-2xl font-bold">{formatMoney(stats.monthlyEarnings)}</p>
                    <p className="mt-1 text-sm text-white/80">Total earnings this month</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-text">Payment history</h2>
                {payments.length > 0 ? (
                  <div className="space-y-3">
                    {payments.map((row) => {
                      const meta = PAYMENT_STATUS_META[row.status] ?? PAYMENT_STATUS_META.pending
                      const StatusIcon = meta.icon
                      return (
                        <div
                          key={row.id}
                          className="flex flex-col gap-2 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-text">
                              {row.reservation?.item?.title ?? 'Rental'}
                            </p>
                            <p className="text-xs text-text-muted">Rental payment</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-semibold text-text">
                              {formatMoney(row.amount)}
                            </span>
                            <span className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${meta.className}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-text-muted">
                    No payments yet. They'll show up here once a renter pays for one of your listings.
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-2xl bg-primary p-6 text-white">
                <h2 className="font-display text-lg font-semibold">Next payout</h2>
                <p className="mt-2 text-sm text-white/75">
                  {stats.nextPayout
                    ? 'Your next payment release is scheduled after the renter confirms the return.'
                    : 'You have no pending payouts right now.'}
                </p>
                <p className="mt-3 font-mono text-2xl font-bold">
                  {stats.nextPayout ? formatMoney(stats.nextPayout.amount) : formatMoney(0)}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import StarRating from '../components/StarRating'
import StatusMessage from '../components/StatusMessage'
import AuroraBlobs from '../components/background/AuroraBlobs'

const STATUS_STYLES = {
  pending: 'bg-jet-black/10 text-text-muted',
  confirmed: 'bg-surface-raised text-primary',
  active: 'bg-surface-raised text-primary',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-jet-black/10 text-text-muted',
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
  const [cancelStatus, setCancelStatus] = useState({ type: '', text: '' })

  const [myReviews, setMyReviews] = useState({})
  const [openReviewId, setOpenReviewId] = useState(null)
  const [draftRating, setDraftRating] = useState(0)
  const [draftComment, setDraftComment] = useState('')
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewStatus, setReviewStatus] = useState({ type: '', text: '' })

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
           item:items(title, owner_id, owner:profiles!items_owner_id_fkey(full_name))`
        )
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('reservations')
        .select(
          `id, start_date, end_date, status, total_price, renter_id,
           item:items!inner(title, owner_id),
           renter:profiles!reservations_renter_id_fkey(full_name)`
        )
        .eq('item.owner_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('reviews').select('reservation_id, rating, comment').eq('reviewer_id', user.id),
    ]).then(([rentalsRes, lendingsRes, reviewsRes]) => {
      if (cancelled) return
      if (rentalsRes.error || lendingsRes.error) {
        setError('Could not load your activity. Please refresh.')
      } else {
        setRentals(
          (rentalsRes.data ?? []).map((r) => ({
            id: r.id,
            itemTitle: r.item?.title ?? 'Item',
            counterparty: r.item?.owner?.full_name ?? 'Lender',
            revieweeId: r.item?.owner_id ?? null,
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
            revieweeId: r.renter_id,
            startDate: r.start_date,
            endDate: r.end_date,
            totalPrice: Number(r.total_price),
            status: r.status,
          }))
        )

        const reviewMap = {}
        for (const rv of reviewsRes.data ?? []) {
          reviewMap[rv.reservation_id] = { rating: rv.rating, comment: rv.comment }
        }
        setMyReviews(reviewMap)
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
    setCancelStatus({ type: '', text: '' })
    const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id)
    setCancelling(false)

    if (error) {
      // guard_reservation_client_update (see migration 0024) raises these
      // exact codes as the Postgres exception message when the client
      // tries a transition it can't do itself.
      const code = error.message?.trim()
      setCancelStatus({
        type: 'error',
        text:
          code === 'CANNOT_CANCEL_AFTER_DROPOFF'
            ? 'This item has already been dropped off at the locker, so it can’t be cancelled here. Contact support if you need help.'
            : code === 'INVALID_STATUS_TRANSITION'
              ? 'This reservation can no longer be cancelled.'
              : 'Could not cancel this reservation. Please try again.',
      })
      return
    }

    setRentals((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)))
    setConfirmCancelId(null)
    setCancelStatus({ type: 'success', text: 'Reservation cancelled — refund simulated, no real charge was made.' })
  }

  function openReviewForm(row) {
    setOpenReviewId(row.id)
    setDraftRating(0)
    setDraftComment('')
    setReviewStatus({ type: '', text: '' })
  }

  async function handleSubmitReview(e, row) {
    e.preventDefault()
    if (!draftRating) {
      setReviewStatus({ type: 'error', text: 'Pick a rating first.' })
      return
    }

    setReviewSubmitting(true)
    setReviewStatus({ type: '', text: '' })

    const { error } = await supabase.from('reviews').insert({
      reservation_id: row.id,
      reviewer_id: user.id,
      reviewee_id: row.revieweeId,
      rating: draftRating,
      comment: draftComment.trim() || null,
    })

    setReviewSubmitting(false)

    if (error) {
      setReviewStatus({ type: 'error', text: 'Could not save your review. Please try again.' })
      return
    }

    setMyReviews((prev) => ({ ...prev, [row.id]: { rating: draftRating, comment: draftComment.trim() || null } }))
    setOpenReviewId(null)
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Activity</h1>
          <p className="mt-1 text-sm text-text-muted">
            Every rental and lending transaction in one place.
          </p>

          <div className="mt-6 flex gap-2 rounded-full bg-surface-raised p-1">
            {[
              { id: 'rentals', label: 'As renter' },
              { id: 'lendings', label: 'As lender' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-full py-2 text-sm font-semibold transition ${
                  tab === t.id ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          {cancelStatus.text && (
            <div className="mt-4" aria-live="polite" role="status">
              <StatusMessage type={cancelStatus.type} text={cancelStatus.text} />
            </div>
          )}

          {loading ? (
            <p className="mt-8 text-center text-sm text-text-muted">Loading activity…</p>
          ) : rows.length > 0 ? (
            <div className="mt-6 space-y-3">
              {rows.map((row) => (
                <div key={row.id} className="rounded-2xl border border-border bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-text">{row.itemTitle}</p>
                      <p className="text-xs text-text-muted">
                        {tab === 'rentals' ? 'Lent by' : 'Rented by'} {row.counterparty}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-text-muted">{formatDateRange(row.startDate, row.endDate)}</span>
                    <span className="font-mono text-sm font-semibold text-text">
                      ${row.totalPrice.toFixed(2)}
                    </span>
                  </div>

                  {row.status === 'confirmed' && (
                    <div className="mt-3 border-t border-border pt-3">
                      <Link
                        to={tab === 'rentals' ? `/rental-tracking?reservationId=${row.id}` : `/owner-delivery?reservationId=${row.id}`}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        {tab === 'rentals' ? 'Track pickup →' : 'Deliver item →'}
                      </Link>
                    </div>
                  )}

                  {row.status === 'completed' && row.revieweeId && (
                    <div className="mt-3 border-t border-border pt-3">
                      {myReviews[row.id] ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <StarRating value={myReviews[row.id].rating} size="sm" />
                            <span className="text-xs text-text-muted">
                              You rated {tab === 'rentals' ? 'this lender' : 'this renter'}
                            </span>
                          </div>
                          {myReviews[row.id].comment && (
                            <p className="mt-1.5 text-xs leading-5 text-text-muted">{myReviews[row.id].comment}</p>
                          )}
                        </div>
                      ) : openReviewId === row.id ? (
                        <form onSubmit={(e) => handleSubmitReview(e, row)} className="space-y-2">
                          <StarRating value={draftRating} onChange={setDraftRating} size="sm" />
                          <textarea
                            value={draftComment}
                            onChange={(e) => setDraftComment(e.target.value.slice(0, 500))}
                            placeholder={`How was ${row.counterparty}?`}
                            rows={2}
                            className="w-full resize-none rounded-xl border border-border px-3 py-2 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <StatusMessage type={reviewStatus.type} text={reviewStatus.text} />
                            <div className="ml-auto flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => setOpenReviewId(null)}
                                className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-muted hover:bg-surface-raised"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={reviewSubmitting}
                                className="rounded-full bg-linear-to-r from-deep-purple to-lavender px-3 py-1 text-xs font-semibold text-soft-white disabled:opacity-50"
                              >
                                {reviewSubmitting ? 'Saving…' : 'Submit'}
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openReviewForm(row)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          Rate {tab === 'rentals' ? 'this lender' : 'this renter'} →
                        </button>
                      )}
                    </div>
                  )}

                  {canCancel(row) && (
                    <div className="mt-3 border-t border-border pt-3">
                      {confirmCancelId === row.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="mr-auto text-xs text-text-muted">Cancel this reservation?</span>
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(null)}
                            disabled={cancelling}
                            className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-text-muted hover:bg-surface-raised"
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
              <Clock className="h-8 w-8 text-text-muted" />
              <p className="font-display text-lg font-semibold text-text">Nothing here yet</p>
              <p className="text-sm text-text-muted">
                Your {tab === 'rentals' ? 'reservations' : 'listings activity'} will show up here.
              </p>
              <Link to="/explore" className="mt-2 text-sm font-semibold text-primary hover:underline">
                Browse Explore
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

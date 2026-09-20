import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Heart, Lock, MapPin, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { getCategoryIcon } from '../lib/categoryIcons'
import LockerAvatar from '../components/LockerAvatar'
import StarRating from '../components/StarRating'
import StatusMessage from '../components/StatusMessage'
import AvailabilityCalendar from '../components/AvailabilityCalendar'
import AuroraBlobs from '../components/background/AuroraBlobs'

function photoUrl(photo) {
  return supabase.storage.from('item-photos').getPublicUrl(photo.storage_path).data.publicUrl
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function rentalDays(start, end) {
  const ms = startOfDay(end) - startOfDay(start)
  return Math.round(ms / 86400000) + 1
}

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ItemDetail() {
  const { itemId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  const [reviews, setReviews] = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [reviewStatus, setReviewStatus] = useState({ type: '', text: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [hasRented, setHasRented] = useState(false)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [messaging, setMessaging] = useState(false)

  const [bookedRanges, setBookedRanges] = useState([])
  const [showBooking, setShowBooking] = useState(false)
  const [selectedRange, setSelectedRange] = useState({ start: null, end: null })
  const [booking, setBooking] = useState(false)
  const [bookingStatus, setBookingStatus] = useState({ type: '', text: '' })
  const [breakdown, setBreakdown] = useState(null)
  const [breakdownLoading, setBreakdownLoading] = useState(false)

  const loadItem = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select(`
        id, title, description, price_per_day, original_price_per_day, declared_value, location_city, is_available, condition, created_at,
        category:categories(id, name, slug),
        photos:item_photos(id, storage_path, display_order),
        owner:profiles!items_owner_id_fkey(id, full_name, avatar_url, bio, verification_status, average_rating, total_reviews, is_premium)
      `)
      .eq('id', itemId)
      .maybeSingle()

    if (error || !data) {
      setNotFound(true)
    } else {
      setItem(data)
    }
    setLoading(false)
  }, [itemId])

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    const { data } = await supabase
      .from('item_reviews')
      .select('id, rating, comment, created_at, reviewer:profiles!item_reviews_reviewer_id_fkey(id, full_name, avatar_url)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
    setReviews(data ?? [])
    const mine = (data ?? []).find((r) => r.reviewer?.id === user?.id)
    if (mine) {
      setMyRating(mine.rating)
      setMyComment(mine.comment ?? '')
    }
    setReviewsLoading(false)
  }, [itemId, user?.id])

  useEffect(() => {
    loadItem()
  }, [loadItem])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  useEffect(() => {
    if (!user) {
      setHasRented(false)
      return
    }
    let cancelled = false
    supabase
      .from('reservations')
      .select('id')
      .eq('item_id', itemId)
      .eq('renter_id', user.id)
      .in('status', ['confirmed', 'active', 'completed'])
      .limit(1)
      .then(({ data }) => {
        if (!cancelled) setHasRented((data ?? []).length > 0)
      })
    return () => {
      cancelled = true
    }
  }, [itemId, user])

  const loadBookedRanges = useCallback(async () => {
    const { data } = await supabase.rpc('get_item_booked_ranges', { p_item_id: itemId })
    setBookedRanges(data ?? [])
  }, [itemId])

  useEffect(() => {
    loadBookedRanges()
  }, [loadBookedRanges])

  useEffect(() => {
    if (!user) {
      setIsFavorited(false)
      return
    }
    let cancelled = false
    supabase
      .from('favorites')
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsFavorited(Boolean(data))
      })
    return () => {
      cancelled = true
    }
  }, [user, itemId])

  const isOwner = Boolean(user) && item?.owner?.id === user.id

  const isCurrentlyRented = useMemo(() => {
    const todayIso = toISODate(new Date())
    return bookedRanges.some(
      (r) => (r.status === 'confirmed' || r.status === 'active') && todayIso >= r.start_date && todayIso <= r.end_date
    )
  }, [bookedRanges])

  const days = selectedRange.start && selectedRange.end ? rentalDays(selectedRange.start, selectedRange.end) : 0

  useEffect(() => {
    if (!item || days <= 0) {
      setBreakdown(null)
      return
    }
    let cancelled = false
    setBreakdownLoading(true)
    supabase
      .rpc('calculate_pricing_breakdown', {
        p_price_per_day: item.price_per_day,
        p_days: days,
        p_declared_value: item.declared_value,
        p_category_id: item.category?.id,
        p_is_premium: Boolean(item.owner?.is_premium),
      })
      .then(({ data, error }) => {
        if (cancelled) return
        setBreakdown(error ? null : data?.[0] ?? null)
        setBreakdownLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [item, days])

  function handleStartBooking() {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/item/${itemId}` } } })
      return
    }
    setBookingStatus({ type: '', text: '' })
    setShowBooking((v) => !v)
  }

  async function handleConfirmBooking() {
    if (!selectedRange.start || !selectedRange.end || !user) return
    setBooking(true)
    setBookingStatus({ type: '', text: '' })

    // Simulated payment: no real gateway is involved yet, so the
    // reservation is confirmed immediately instead of going through a
    // checkout redirect + webhook (see PaymentProvider in
    // PLAN_MVP_70.md Fase 4 — swap this for a real provider later
    // without touching the rest of the booking flow).
    //
    // Price/fee/damage-liability amounts are never sent from the
    // client — create_simulated_reservation recomputes all of them
    // server-side via calculate_pricing_breakdown before writing
    // anything, so a tampered request can't under-pay or dodge the
    // damage-liability hold.
    const { error } = await supabase.rpc('create_simulated_reservation', {
      p_item_id: itemId,
      p_start_date: toISODate(selectedRange.start),
      p_end_date: toISODate(selectedRange.end),
    })

    setBooking(false)

    if (error) {
      const overlapping = error.code === '23P01' || error.message?.toLowerCase().includes('exclu')
      setBookingStatus({
        type: 'error',
        text: overlapping
          ? 'Those dates were just booked by someone else. Please pick different dates.'
          : 'Could not complete the booking. Please try again.',
      })
      await loadBookedRanges()
      return
    }

    setBookingStatus({ type: 'success', text: 'Booking confirmed! (Simulated: no real payment was processed.)' })
    setSelectedRange({ start: null, end: null })
    await loadBookedRanges()
  }

  async function handleToggleFavorite() {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/item/${itemId}` } } })
      return
    }
    if (isFavorited) {
      setIsFavorited(false)
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('item_id', itemId)
    } else {
      setIsFavorited(true)
      await supabase.from('favorites').insert({ user_id: user.id, item_id: itemId })
    }
  }

  async function handleMessageOwner() {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/item/${itemId}` } } })
      return
    }
    setMessaging(true)
    const { data, error } = await supabase.rpc('start_conversation', {
      other_user_id: item.owner.id,
      p_item_id: itemId,
    })
    setMessaging(false)
    if (!error && data) {
      navigate(`/messages/${data}`)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const paths = (item.photos || []).map((p) => p.storage_path)
    if (paths.length > 0) {
      await supabase.storage.from('item-photos').remove(paths)
    }
    const { error } = await supabase.from('items').delete().eq('id', itemId)
    if (error) {
      setDeleting(false)
      return
    }
    navigate('/explore', { replace: true })
  }

  async function handleSubmitReview(e) {
    e.preventDefault()
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/item/${itemId}` } } })
      return
    }
    if (myRating < 1) {
      setReviewStatus({ type: 'error', text: 'Pick a star rating first.' })
      return
    }
    if (!hasRented) {
      setReviewStatus({ type: 'error', text: 'You can review this item after renting it.' })
      return
    }
    setSubmittingReview(true)
    setReviewStatus({ type: '', text: '' })

    const { error } = await supabase.from('item_reviews').upsert(
      {
        item_id: itemId,
        reviewer_id: user.id,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: 'item_id,reviewer_id' }
    )

    setSubmittingReview(false)

    if (error) {
      setReviewStatus({ type: 'error', text: 'Could not save your review. Please try again.' })
      return
    }

    setReviewStatus({ type: 'success', text: 'Thanks for your review!' })
    await Promise.all([loadReviews(), loadItem()])
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-soft-white">
        <p className="text-sm text-jet-black/50">Loading listing…</p>
      </div>
    )
  }

  if (notFound || !item) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-soft-white px-6 text-center">
        <p className="font-display text-lg font-semibold text-jet-black">Listing not found</p>
        <p className="text-sm text-jet-black/50">It may have been removed by its owner.</p>
        <Link to="/explore" className="text-sm font-semibold text-deep-purple hover:text-lavender">
          Back to Explore
        </Link>
      </div>
    )
  }

  const photos = [...(item.photos || [])].sort((a, b) => a.display_order - b.display_order)
  const CategoryIcon = getCategoryIcon(item.category?.slug)
  const hasOwnerReviews = (item.owner?.total_reviews ?? 0) > 0

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/85 backdrop-blur-md">
        <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4 sm:px-10">
          <Link
            to="/explore"
            aria-label="Back to Explore"
            className="flex items-center gap-2 text-sm font-medium text-jet-black/60 transition hover:text-deep-purple"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </Link>
          <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
          <div className="w-24" />
        </div>
      </header>

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-5xl px-6 pt-8 sm:px-10">
          <div className="grid gap-8 lg:grid-cols-5">
            {/* ================= PHOTOS ================= */}
            <div className="lg:col-span-3">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-jet-black/5 shadow-sm">
                {photos[activePhoto] && (
                  <img
                    src={photoUrl(photos[activePhoto])}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                )}
                {!isOwner && (
                  <button
                    type="button"
                    aria-label={isFavorited ? 'Remove from saved' : 'Save'}
                    onClick={handleToggleFavorite}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-jet-black/40 text-soft-white backdrop-blur transition hover:bg-jet-black/60"
                  >
                    <Heart className={`h-4 w-4 ${isFavorited ? 'fill-lavender text-lavender' : ''}`} />
                  </button>
                )}
              </div>
              {photos.length > 1 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {photos.map((photo, index) => (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setActivePhoto(index)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                        index === activePhoto ? 'border-lavender' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={photoUrl(photo)} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ================= DETAILS ================= */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-jet-black/50">
                <CategoryIcon className="h-3.5 w-3.5" />
                {item.category?.name}
                {!item.is_available && (
                  <span className="ml-2 rounded-full bg-jet-black/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-jet-black/50">
                    Unavailable
                  </span>
                )}
                {isCurrentlyRented && (
                  <span className="ml-2 rounded-full bg-lavender/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-deep-purple">
                    Currently rented
                  </span>
                )}
              </div>
              <h1 className="mt-1.5 font-display text-2xl font-bold text-jet-black">{item.title}</h1>

              <p className="mt-2 font-mono text-xl font-semibold text-jet-black">
                ${item.price_per_day}
                <span className="font-body text-sm font-normal text-jet-black/45"> / day</span>
              </p>

              {Number(item.original_price_per_day) !== Number(item.price_per_day) && (
                <p className="mt-0.5 text-xs text-jet-black/40">
                  Listed at ${item.original_price_per_day}/day originally
                </p>
              )}

              {Number(item.declared_value) > 0 && (
                <p className="mt-1 text-xs text-jet-black/45">
                  Backed by a refundable damage-liability hold — see breakdown when booking
                </p>
              )}

              <div className="mt-2 flex items-center gap-1.5 text-xs text-jet-black/50">
                <MapPin className="h-3.5 w-3.5" />
                {item.location_city}
              </div>

              {/* Owner card */}
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-jet-black/10 bg-white p-4">
                <LockerAvatar
                  label={item.owner?.full_name}
                  photoUrl={item.owner?.avatar_url}
                  verified={item.owner?.verification_status === 'verified'}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-jet-black">
                    {item.owner?.full_name}
                  </p>
                  {hasOwnerReviews ? (
                    <div className="mt-0.5 flex items-center gap-1">
                      <StarRating value={item.owner.average_rating} size="sm" />
                      <span className="font-mono text-xs text-jet-black/50">
                        {Number(item.owner.average_rating).toFixed(1)} ({item.owner.total_reviews})
                      </span>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-jet-black/40">New lender · no reviews yet</p>
                  )}
                </div>
                {item.owner?.verification_status === 'verified' && (
                  <ShieldCheck className="h-4 w-4 shrink-0 text-lavender" />
                )}
              </div>

              {!isOwner && (
                <button
                  type="button"
                  onClick={handleMessageOwner}
                  disabled={messaging}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm font-semibold text-jet-black/70 transition hover:border-lavender hover:text-deep-purple disabled:opacity-50"
                >
                  <MessageCircle className="h-4 w-4" />
                  {messaging ? 'Starting conversation…' : `Message ${item.owner?.full_name?.split(' ')[0] ?? 'lender'}`}
                </button>
              )}

              {!isOwner && (
                <div className="mt-3">
                  {!showBooking ? (
                    <button
                      type="button"
                      onClick={handleStartBooking}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-deep-purple to-lavender px-4 py-2.5 text-sm font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Rent
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-2xl border border-lavender/15 bg-white p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-jet-black">Pick your dates</p>
                        <button
                          type="button"
                          onClick={() => setShowBooking(false)}
                          className="text-xs font-semibold text-jet-black/50 hover:text-deep-purple"
                        >
                          Cancel
                        </button>
                      </div>

                      <AvailabilityCalendar
                        bookedRanges={bookedRanges}
                        selectedRange={selectedRange}
                        onSelectRange={setSelectedRange}
                      />

                      {days > 0 && breakdownLoading && (
                        <p className="text-xs text-jet-black/40">Calculating price breakdown…</p>
                      )}

                      {days > 0 && !breakdownLoading && breakdown && (
                        <div className="space-y-1.5 rounded-xl bg-jet-black/5 p-3 text-xs">
                          <div className="flex items-center justify-between text-jet-black/70">
                            <span>
                              ${item.price_per_day} × {days} day{days > 1 ? 's' : ''}
                            </span>
                            <span className="font-mono">${Number(breakdown.rental_subtotal).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between text-jet-black/70">
                            <span>Protection fee (non-refundable)</span>
                            <span className="font-mono">${Number(breakdown.protection_fee_amount).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-jet-black/10 pt-1.5 font-semibold text-jet-black">
                            <span>Charged today</span>
                            <span className="font-mono">${Number(breakdown.total_charged_today).toFixed(2)}</span>
                          </div>

                          <div className="flex items-start gap-1.5 border-t border-jet-black/10 pt-1.5 text-jet-black/50">
                            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>
                              {breakdown.commission_rate > 0
                                ? `Lendrop's ${Math.round(breakdown.commission_rate * 100)}% commission ($${Number(breakdown.commission_amount).toFixed(2)}) is deducted from the lender's payout — it doesn't add to what you pay.`
                                : `${item.owner?.full_name?.split(' ')[0] ?? 'This lender'} is Premium, so Lendrop charges no commission on this rental.`}
                            </span>
                          </div>

                          <div className="flex items-start gap-1.5 text-jet-black/50">
                            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>
                              ${Number(breakdown.damage_liability_amount).toFixed(2)} damage-liability hold (not charged now — refunded automatically if the item comes back with no damage
                              {breakdown.damage_liability_cap_applied ? `; capped at $${Number(breakdown.damage_liability_cap_applied).toFixed(2)} for this category` : ''}).
                            </span>
                          </div>
                        </div>
                      )}

                      <StatusMessage type={bookingStatus.type} text={bookingStatus.text} />

                      <button
                        type="button"
                        onClick={handleConfirmBooking}
                        disabled={!selectedRange.end || booking}
                        className="w-full rounded-xl bg-deep-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-purple/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {booking ? 'Processing…' : 'Pay in Advance'}
                      </button>
                      <p className="text-center text-[11px] text-jet-black/40">
                        Sandbox checkout: no real charge is made yet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isOwner && (
                <div className="mt-6">
                  <h2 className="mb-2 font-display text-sm font-semibold text-jet-black">Your booking calendar</h2>
                  <AvailabilityCalendar bookedRanges={bookedRanges} readOnly />
                </div>
              )}

              <div className="mt-6">
                <h2 className="font-display text-sm font-semibold text-jet-black">Description</h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-jet-black/60">
                  {item.description}
                </p>
              </div>

              {isOwner && (
                <div className="mt-6 border-t border-jet-black/5 pt-4">
                  {confirmingDelete ? (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-jet-black/60">Delete this listing?</p>
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        disabled={deleting}
                        className="rounded-full border border-jet-black/10 px-3 py-1.5 text-xs font-semibold text-jet-black/70 hover:bg-jet-black/5"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleting ? 'Deleting…' : 'Confirm delete'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete listing
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ================= REVIEWS ================= */}
          <section className="mt-12 border-t border-jet-black/5 pt-8">
            <h2 className="font-display text-lg font-semibold text-jet-black">
              Reviews {reviews.length > 0 && `(${reviews.length})`}
            </h2>

            {!isOwner && hasRented && (
              <form
                onSubmit={handleSubmitReview}
                className="mt-4 rounded-2xl border border-lavender/15 bg-white p-4"
              >
                <p className="mb-2 text-sm font-medium text-jet-black">Rate this lender</p>
                <StarRating value={myRating} onChange={setMyRating} />
                <textarea
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value.slice(0, 500))}
                  placeholder="Share how the item and pickup went…"
                  rows={3}
                  className="mt-3 w-full resize-none rounded-xl border border-lavender/15 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <StatusMessage type={reviewStatus.type} text={reviewStatus.text} />
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="ml-auto shrink-0 rounded-full bg-linear-to-r from-deep-purple to-lavender px-4 py-2 text-xs font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105 disabled:opacity-50"
                  >
                    {submittingReview ? 'Saving…' : 'Post review'}
                  </button>
                </div>
              </form>
            )}

            {!isOwner && !hasRented && (
              <p className="mt-4 rounded-2xl border border-jet-black/5 bg-jet-black/[0.02] p-4 text-sm text-jet-black/50">
                {user ? 'You can leave a review once you have rented this item.' : 'Sign in and rent this item to leave a review.'}
              </p>
            )}

            <div className="mt-6 space-y-4">
              {reviewsLoading ? (
                <p className="text-sm text-jet-black/40">Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <p className="text-sm text-jet-black/40">No reviews yet. Be the first to comment.</p>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="flex gap-3 rounded-2xl border border-jet-black/5 bg-white p-4">
                    <LockerAvatar
                      label={review.reviewer?.full_name}
                      photoUrl={review.reviewer?.avatar_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-jet-black">
                          {review.reviewer?.full_name ?? 'Lendrop user'}
                        </p>
                        <span className="shrink-0 text-[11px] text-jet-black/40">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <StarRating value={review.rating} size="sm" className="mt-1" />
                      {review.comment && (
                        <p className="mt-1.5 text-sm leading-5 text-jet-black/60">{review.comment}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

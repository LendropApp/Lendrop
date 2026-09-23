import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Camera, CheckCircle2, Clock3, Lock, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import StatusMessage from '../components/StatusMessage'
import AuroraBlobs from '../components/background/AuroraBlobs'

const STEPS = ['Reserved', 'Delivered', 'In Use', 'Returned']

function formatDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString([], opts)} – ${new Date(end).toLocaleDateString([], opts)}`
}

export default function RentalTracking() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const paramReservationId = searchParams.get('reservationId')

  const [reservation, setReservation] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [pickList, setPickList] = useState(null)

  const [dui, setDui] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState({ type: '', text: '' })

  const [returnPhoto, setReturnPhoto] = useState(null)
  const [returnPhotoPreview, setReturnPhotoPreview] = useState(null)
  const [returnDui, setReturnDui] = useState('')
  const [returnPassword, setReturnPassword] = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnStatus, setReturnStatus] = useState({ type: '', text: '' })

  const loadReservation = useCallback(async () => {
    if (!user) {
      setLoading(false)
      setNotFound(true)
      return
    }
    setLoading(true)
    setPickList(null)

    let reservationId = paramReservationId
    if (!reservationId) {
      // No specific reservation was requested (e.g. the nav bar's generic
      // "Track" button) — if there's more than one active rental, we can't
      // just guess which one the user means, so ask instead of silently
      // always showing the most recent.
      const { data } = await supabase
        .from('reservations')
        .select('id, start_date, end_date, item:items(title)')
        .eq('renter_id', user.id)
        .in('status', ['confirmed', 'active'])
        .order('created_at', { ascending: false })

      const rows = data ?? []
      if (rows.length === 0) {
        setReservation(null)
        setNotFound(true)
        setLoading(false)
        return
      }
      if (rows.length > 1) {
        setPickList(rows)
        setLoading(false)
        return
      }
      reservationId = rows[0].id
    }

    if (!reservationId) {
      setReservation(null)
      setNotFound(true)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('reservations')
      .select(
        `id, status, start_date, end_date, compartment_id,
         item:items(title, owner:profiles!items_owner_id_fkey(full_name)),
         compartment:locker_compartments(compartment_code, locker:lockers(name, address, city))`
      )
      .eq('id', reservationId)
      .eq('renter_id', user.id)
      .maybeSingle()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setReservation(data)

    const { data: eventRows } = await supabase
      .from('locker_events')
      .select('event_type, occurred_at')
      .eq('reservation_id', reservationId)
      .order('occurred_at', { ascending: true })
    setEvents(eventRows ?? [])
    setLoading(false)
  }, [user, paramReservationId])

  useEffect(() => {
    loadReservation()
  }, [loadReservation])

  async function handlePickup(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormStatus({ type: '', text: '' })

    const { data, error } = await supabase.functions.invoke('locker-access', {
      body: { reservationId: reservation.id, dui, password, action: 'pickup' },
    })

    setSubmitting(false)

    if (error || data?.error) {
      setFormStatus({ type: 'error', text: data?.error ?? 'Could not verify your identity. Please try again.' })
      return
    }

    setDui('')
    setPassword('')
    setFormStatus({ type: 'success', text: 'Locker opened — enjoy your rental!' })
    await loadReservation()
  }

  function handleReturnPhotoChange(e) {
    const file = e.target.files?.[0] ?? null
    setReturnPhoto(file)
    setReturnPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleReturn(e) {
    e.preventDefault()
    if (!returnPhoto) {
      setReturnStatus({ type: 'error', text: 'Attach a condition photo before confirming the return.' })
      return
    }
    setReturnSubmitting(true)
    setReturnStatus({ type: '', text: '' })

    const ext = returnPhoto.name.split('.').pop()
    const path = `${reservation.id}/return_drop_off-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('evidence-photos').upload(path, returnPhoto)
    if (uploadError) {
      setReturnSubmitting(false)
      setReturnStatus({ type: 'error', text: 'Could not upload the photo. Please try again.' })
      return
    }

    const { error: evidenceError } = await supabase.from('photo_evidence').insert({
      reservation_id: reservation.id,
      stage: 'return_drop_off',
      storage_path: path,
      uploaded_by: user.id,
    })
    if (evidenceError) {
      setReturnSubmitting(false)
      setReturnStatus({ type: 'error', text: 'Could not save the photo record. Please try again.' })
      return
    }

    const { data, error } = await supabase.functions.invoke('locker-access', {
      body: { reservationId: reservation.id, dui: returnDui, password: returnPassword, action: 'return_dropoff' },
    })

    setReturnSubmitting(false)

    if (error || data?.error) {
      setReturnStatus({ type: 'error', text: data?.error ?? 'Could not verify your identity. Please try again.' })
      return
    }

    setReturnDui('')
    setReturnPassword('')
    setReturnStatus({ type: 'success', text: 'Return confirmed — thanks!' })
    await loadReservation()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg">
        <p className="text-sm text-text-muted">Loading your rental…</p>
      </div>
    )
  }

  if (pickList) {
    return (
      <div className="min-h-screen bg-bg pb-16">
        <PageHeader backTo="/history" backLabel="Back to Activity" />
        <div className="mx-auto max-w-2xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Which rental?</h1>
          <p className="mt-1 text-sm text-text-muted">
            You have {pickList.length} active rentals — pick one to track.
          </p>
          <div className="mt-6 space-y-3">
            {pickList.map((r) => (
              <Link
                key={r.id}
                to={`/rental-tracking?reservationId=${r.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:border-primary"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-text">{r.item?.title ?? 'Item'}</p>
                  <p className="text-xs text-text-muted">{formatDateRange(r.start_date, r.end_date)}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-primary">Track →</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !reservation) {
    return (
      <div className="min-h-screen bg-bg pb-28 md:pb-16">
        <PageHeader backTo="/history" backLabel="Back to Activity" />
        <div className="flex flex-col items-center gap-2 px-6 py-24 text-center">
          <Clock3 className="h-8 w-8 text-text-muted" />
          <p className="font-display text-lg font-semibold text-text">No active rental right now</p>
          <p className="text-sm text-text-muted">Once you book an item, track its pickup here.</p>
          <Link to="/explore" className="mt-2 text-sm font-semibold text-primary hover:underline">
            Browse Explore
          </Link>
        </div>
      </div>
    )
  }

  const hasDeposited = events.some((e) => e.event_type === 'item_deposited')
  const hasRetrieved = events.some((e) => e.event_type === 'item_retrieved')
  const hasReturnDeposited = events.some((e) => e.event_type === 'return_deposited')
  const hasReturnRetrieved = events.some((e) => e.event_type === 'return_retrieved')
  const currentStep = hasReturnRetrieved ? 3 : hasRetrieved ? 2 : hasDeposited ? 1 : 0
  const locker = reservation.compartment?.locker

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/history" backLabel="Back to Activity" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-2xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">{reservation.item?.title}</h1>
          <p className="mt-1 text-sm text-text-muted">Lent by {reservation.item?.owner?.full_name ?? 'the lender'}</p>

          <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
            <div className="relative flex items-center justify-between">
              <div className="absolute left-0 top-5 h-1 w-full bg-jet-black/10">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
                />
              </div>
              {STEPS.map((step, index) => (
                <div key={step} className="relative z-10 flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-4 font-bold ${
                      index < currentStep
                        ? 'border-primary bg-primary text-white'
                        : index === currentStep
                          ? 'border-primary bg-lavender text-white'
                          : 'border-border bg-surface text-text-muted'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <span className={`mt-2 text-xs ${index === currentStep ? 'font-semibold text-primary' : 'text-text-muted'}`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {locker && (
            <section className="mt-4 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-semibold text-text">
                  {locker.name} · Compartment {reservation.compartment?.compartment_code}
                </p>
                <p className="text-text-muted">
                  {locker.address}, {locker.city}
                </p>
              </div>
            </section>
          )}

          {!reservation.compartment_id && (
            <p className="mt-4 rounded-2xl border border-border bg-jet-black/[0.02] p-4 text-sm text-text-muted">
              We're finding you a locker — check back soon.
            </p>
          )}

          {reservation.compartment_id && !hasDeposited && (
            <p className="mt-4 rounded-2xl border border-border bg-jet-black/[0.02] p-4 text-sm text-text-muted">
              Waiting for the lender to drop off the item at this locker.
            </p>
          )}

          {reservation.compartment_id && hasDeposited && !hasRetrieved && (
            <form onSubmit={handlePickup} className="mt-4 rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text">Pick up your item</p>
              </div>
              <p className="mb-4 text-xs text-text-muted">
                Enter your DUI and account password at the locker to confirm it's you and unlock the compartment.
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={dui}
                  onChange={(e) => setDui(e.target.value)}
                  placeholder="DUI"
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <StatusMessage type={formStatus.type} text={formStatus.text} />
                <button
                  type="submit"
                  disabled={submitting}
                  className="ml-auto shrink-0 rounded-full cta-brand px-4 py-2 text-xs font-semibold text-soft-white glow-sm transition hover:brightness-105 disabled:opacity-50"
                >
                  {submitting ? 'Verifying…' : 'Unlock locker'}
                </button>
              </div>
            </form>
          )}

          {hasRetrieved && !hasReturnDeposited && (
            <form onSubmit={handleReturn} className="mt-4 rounded-2xl border border-border bg-surface p-5">
              <div className="mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-text">Return your item</p>
              </div>
              <p className="mb-4 text-xs text-text-muted">
                Drop it back at the same locker with a condition photo, then confirm with your DUI and password.
              </p>

              <label
                htmlFor="return-photo"
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-text-muted transition hover:border-primary"
              >
                <Camera className="h-4 w-4 shrink-0 text-primary" />
                {returnPhoto ? returnPhoto.name : 'Attach a condition photo (required)'}
              </label>
              <input
                id="return-photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleReturnPhotoChange}
                required
                className="hidden"
              />
              {returnPhotoPreview && (
                <img src={returnPhotoPreview} alt="Return condition preview" className="mt-2 h-28 w-full rounded-lg object-cover" />
              )}

              <div className="mt-3 space-y-3">
                <input
                  type="text"
                  value={returnDui}
                  onChange={(e) => setReturnDui(e.target.value)}
                  placeholder="DUI"
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
                />
                <input
                  type="password"
                  value={returnPassword}
                  onChange={(e) => setReturnPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <StatusMessage type={returnStatus.type} text={returnStatus.text} />
                <button
                  type="submit"
                  disabled={returnSubmitting}
                  className="ml-auto shrink-0 rounded-full cta-brand px-4 py-2 text-xs font-semibold text-soft-white glow-sm transition hover:brightness-105 disabled:opacity-50"
                >
                  {returnSubmitting ? 'Verifying…' : 'Confirm return'}
                </button>
              </div>
            </form>
          )}

          {hasReturnDeposited && !hasReturnRetrieved && (
            <p className="mt-4 rounded-2xl border border-border bg-jet-black/[0.02] p-4 text-sm text-text-muted">
              Return dropped off — waiting for the lender to confirm they picked it up.
            </p>
          )}

          {hasReturnRetrieved && (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-sm text-emerald-700">Rental completed. Thanks for using Lendrop!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

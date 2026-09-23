import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Camera, Lock, MapPin, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import StatusMessage from '../components/StatusMessage'
import AuroraBlobs from '../components/background/AuroraBlobs'

function DeliveryForm({ reservation, onDelivered }) {
  const { user } = useAuth()
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [dui, setDui] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })

  function handlePhotoChange(e) {
    const file = e.target.files?.[0] ?? null
    setPhoto(file)
    setPhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!photo) {
      setStatus({ type: 'error', text: 'Attach a photo of the item before confirming drop-off.' })
      return
    }
    setSubmitting(true)
    setStatus({ type: '', text: '' })

    // Fase 6: no drop-off can be confirmed without condition evidence —
    // uploaded first so locker-access can verify it exists before it
    // will log the item as delivered.
    const ext = photo.name.split('.').pop()
    const path = `${reservation.id}/drop_off-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('evidence-photos').upload(path, photo)
    if (uploadError) {
      setSubmitting(false)
      setStatus({ type: 'error', text: 'Could not upload the photo. Please try again.' })
      return
    }

    const { error: evidenceError } = await supabase.from('photo_evidence').insert({
      reservation_id: reservation.id,
      stage: 'drop_off',
      storage_path: path,
      uploaded_by: user.id,
    })
    if (evidenceError) {
      setSubmitting(false)
      setStatus({ type: 'error', text: 'Could not save the photo record. Please try again.' })
      return
    }

    const { data, error } = await supabase.functions.invoke('locker-access', {
      body: { reservationId: reservation.id, dui, password, action: 'deposit' },
    })

    setSubmitting(false)

    if (error || data?.error) {
      setStatus({ type: 'error', text: data?.error ?? 'Could not verify your identity. Please try again.' })
      return
    }

    setStatus({ type: 'success', text: 'Item marked as dropped off!' })
    onDelivered(reservation.id)
  }

  const locker = reservation.compartment?.locker

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text">{reservation.item?.title}</p>
          <p className="text-xs text-text-muted">For {reservation.renter?.full_name ?? 'the renter'}</p>
        </div>
      </div>

      {locker && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-jet-black/[0.02] p-3 text-xs text-text-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            {locker.name} · Compartment {reservation.compartment?.compartment_code} — {locker.address}, {locker.city}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor={`photo-${reservation.id}`}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-xs text-text-muted transition hover:border-primary"
          >
            <Camera className="h-4 w-4 shrink-0 text-primary" />
            {photo ? photo.name : 'Attach a condition photo (required before drop-off)'}
          </label>
          <input
            id={`photo-${reservation.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            required
            className="hidden"
          />
          {photoPreview && (
            <img src={photoPreview} alt="Condition preview" className="mt-2 h-28 w-full rounded-lg object-cover" />
          )}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Lock className="h-3.5 w-3.5" />
          Enter your DUI and account password at the locker to confirm the drop-off.
        </p>
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
        <div className="flex items-center justify-between gap-3">
          <StatusMessage type={status.type} text={status.text} />
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto shrink-0 rounded-full bg-linear-to-r from-deep-purple to-lavender px-4 py-2 text-xs font-semibold text-soft-white glow-sm transition hover:brightness-105 disabled:opacity-50"
          >
            {submitting ? 'Verifying…' : 'Confirm drop-off'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ReturnPickupForm({ reservation, onCompleted }) {
  const { user } = useAuth()
  const [dui, setDui] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })

  const [reportingDamage, setReportingDamage] = useState(false)
  const [damagePhoto, setDamagePhoto] = useState(null)
  const [damagePhotoPreview, setDamagePhotoPreview] = useState(null)
  const [damageReason, setDamageReason] = useState('')

  function handleDamagePhotoChange(e) {
    const file = e.target.files?.[0] ?? null
    setDamagePhoto(file)
    setDamagePhotoPreview(file ? URL.createObjectURL(file) : null)
  }

  function toggleDamageReport() {
    setReportingDamage((prev) => !prev)
    setStatus({ type: '', text: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (reportingDamage && !damagePhoto) {
      setStatus({ type: 'error', text: 'Attach a photo of the damage before reporting it.' })
      return
    }
    if (reportingDamage && !damageReason.trim()) {
      setStatus({ type: 'error', text: 'Describe the damage before reporting it.' })
      return
    }

    setSubmitting(true)
    setStatus({ type: '', text: '' })

    if (reportingDamage) {
      const ext = damagePhoto.name.split('.').pop()
      const path = `${reservation.id}/return_pick_up-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('evidence-photos').upload(path, damagePhoto)
      if (uploadError) {
        setSubmitting(false)
        setStatus({ type: 'error', text: 'Could not upload the photo. Please try again.' })
        return
      }

      const { error: evidenceError } = await supabase.from('photo_evidence').insert({
        reservation_id: reservation.id,
        stage: 'return_pick_up',
        storage_path: path,
        uploaded_by: user.id,
      })
      if (evidenceError) {
        setSubmitting(false)
        setStatus({ type: 'error', text: 'Could not save the photo record. Please try again.' })
        return
      }
    }

    const { data, error } = await supabase.functions.invoke('locker-access', {
      body: {
        reservationId: reservation.id,
        dui,
        password,
        action: 'return_pickup',
        ...(reportingDamage ? { hasDamage: true, damageReason: damageReason.trim() } : {}),
      },
    })

    setSubmitting(false)

    if (error || data?.error) {
      setStatus({ type: 'error', text: data?.error ?? 'Could not verify your identity. Please try again.' })
      return
    }

    setStatus({
      type: 'success',
      text: data?.disputed
        ? 'Damage reported — the deposit stays held pending review.'
        : 'Return confirmed — rental completed!',
    })
    onCompleted(reservation.id)
  }

  const locker = reservation.compartment?.locker

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-text">{reservation.item?.title}</p>
          <p className="text-xs text-text-muted">Returned by {reservation.renter?.full_name ?? 'the renter'}</p>
        </div>
      </div>

      {locker && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-jet-black/[0.02] p-3 text-xs text-text-muted">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>
            {locker.name} · Compartment {reservation.compartment?.compartment_code} — {locker.address}, {locker.city}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        {reportingDamage && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-3">
            <div>
              <label
                htmlFor={`damage-photo-${reservation.id}`}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-red-200 bg-surface px-4 py-3 text-xs text-text-muted transition hover:border-red-400"
              >
                <Camera className="h-4 w-4 shrink-0 text-red-500" />
                {damagePhoto ? damagePhoto.name : 'Attach a photo of the damage (required)'}
              </label>
              <input
                id={`damage-photo-${reservation.id}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleDamagePhotoChange}
                required
                className="hidden"
              />
              {damagePhotoPreview && (
                <img src={damagePhotoPreview} alt="Damage preview" className="mt-2 h-28 w-full rounded-lg object-cover" />
              )}
            </div>
            <textarea
              value={damageReason}
              onChange={(e) => setDamageReason(e.target.value.slice(0, 500))}
              placeholder="Describe the damage…"
              rows={2}
              required
              className="mt-2 w-full resize-none rounded-xl border border-red-200 bg-surface px-3 py-2 text-xs outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
            />
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Lock className="h-3.5 w-3.5" />
          Enter your DUI and account password to confirm you picked up the returned item.
        </p>
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
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleDamageReport}
            className={`flex items-center gap-1.5 text-xs font-semibold ${
              reportingDamage ? 'text-text-muted hover:text-text' : 'text-red-500 hover:text-red-600'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {reportingDamage ? 'Cancel damage report' : 'Report damage instead'}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold text-soft-white glow-sm transition hover:brightness-105 disabled:opacity-50 ${
              reportingDamage ? 'bg-red-500' : 'bg-linear-to-r from-deep-purple to-lavender'
            }`}
          >
            {submitting ? 'Verifying…' : reportingDamage ? 'Submit damage report' : 'Confirm return pickup'}
          </button>
        </div>
        <StatusMessage type={status.type} text={status.text} />
      </form>
    </div>
  )
}

export default function OwnerDeliveryReturn() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [delivered, setDelivered] = useState([])
  const [returnPending, setReturnPending] = useState([])
  const [loading, setLoading] = useState(true)

  const loadReservations = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: reservations } = await supabase
      .from('reservations')
      .select(
        `id, status, compartment_id,
         item:items!inner(title, owner_id),
         renter:profiles!reservations_renter_id_fkey(full_name),
         compartment:locker_compartments(compartment_code, locker:lockers(name, address, city))`
      )
      .eq('item.owner_id', user.id)
      .eq('status', 'confirmed')
      .not('compartment_id', 'is', null)
      .order('created_at', { ascending: false })

    const ids = (reservations ?? []).map((r) => r.id)
    const { data: eventRows } = ids.length
      ? await supabase.from('locker_events').select('reservation_id, event_type').in('reservation_id', ids)
      : { data: [] }

    const eventsByReservation = new Map()
    for (const e of eventRows ?? []) {
      if (!eventsByReservation.has(e.reservation_id)) eventsByReservation.set(e.reservation_id, new Set())
      eventsByReservation.get(e.reservation_id).add(e.event_type)
    }

    const nextPending = []
    const nextDelivered = []
    const nextReturnPending = []

    for (const r of reservations ?? []) {
      const types = eventsByReservation.get(r.id) ?? new Set()
      if (types.has('return_deposited')) {
        nextReturnPending.push(r)
      } else if (types.has('item_deposited')) {
        nextDelivered.push(r)
      } else {
        nextPending.push(r)
      }
    }

    setPending(nextPending)
    setDelivered(nextDelivered)
    setReturnPending(nextReturnPending)
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  function handleDelivered(reservationId) {
    setTimeout(() => loadReservations(), 800)
    // Optimistically move it over so the form's success message is still visible briefly.
    setPending((prev) => prev.filter((r) => r.id !== reservationId))
  }

  function handleReturnCompleted(reservationId) {
    setTimeout(() => loadReservations(), 800)
    setReturnPending((prev) => prev.filter((r) => r.id !== reservationId))
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/history" backLabel="Back to Activity" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-2xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Deliver your items</h1>
          <p className="mt-1 text-sm text-text-muted">Drop off confirmed rentals at their assigned locker.</p>

          {loading ? (
            <p className="mt-8 text-center text-sm text-text-muted">Loading…</p>
          ) : (
            <>
              {returnPending.length > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold text-text-muted">Returned — confirm pickup</h2>
                  <div className="mt-3 space-y-4">
                    {returnPending.map((r) => (
                      <ReturnPickupForm key={r.id} reservation={r} onCompleted={handleReturnCompleted} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {pending.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-12 text-center">
                    <Package className="h-8 w-8 text-text-muted" />
                    <p className="text-sm text-text-muted">Nothing waiting on you right now.</p>
                  </div>
                ) : (
                  pending.map((r) => <DeliveryForm key={r.id} reservation={r} onDelivered={handleDelivered} />)
                )}
              </div>

              {delivered.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-sm font-semibold text-text-muted">Delivered — awaiting pickup</h2>
                  <div className="mt-3 space-y-2">
                    {delivered.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="text-emerald-700">
                          {r.item?.title} — waiting for {r.renter?.full_name ?? 'the renter'} to pick it up.
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

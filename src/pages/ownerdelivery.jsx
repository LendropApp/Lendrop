import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Camera, Lock, MapPin, Package } from 'lucide-react'
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
    <div className="rounded-2xl border border-lavender/15 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-jet-black">{reservation.item?.title}</p>
          <p className="text-xs text-jet-black/45">For {reservation.renter?.full_name ?? 'the renter'}</p>
        </div>
      </div>

      {locker && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-jet-black/[0.02] p-3 text-xs text-jet-black/60">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-deep-purple" />
          <span>
            {locker.name} · Compartment {reservation.compartment?.compartment_code} — {locker.address}, {locker.city}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor={`photo-${reservation.id}`}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-lavender/30 px-4 py-3 text-xs text-jet-black/60 transition hover:border-lavender"
          >
            <Camera className="h-4 w-4 shrink-0 text-deep-purple" />
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

        <p className="flex items-center gap-1.5 text-xs text-jet-black/50">
          <Lock className="h-3.5 w-3.5" />
          Enter your DUI and account password at the locker to confirm the drop-off.
        </p>
        <input
          type="text"
          value={dui}
          onChange={(e) => setDui(e.target.value)}
          placeholder="DUI"
          required
          className="w-full rounded-xl border border-lavender/15 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full rounded-xl border border-lavender/15 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
        />
        <div className="flex items-center justify-between gap-3">
          <StatusMessage type={status.type} text={status.text} />
          <button
            type="submit"
            disabled={submitting}
            className="ml-auto shrink-0 rounded-full bg-linear-to-r from-deep-purple to-lavender px-4 py-2 text-xs font-semibold text-soft-white shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:brightness-105 disabled:opacity-50"
          >
            {submitting ? 'Verifying…' : 'Confirm drop-off'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function OwnerDeliveryReturn() {
  const { user } = useAuth()
  const [pending, setPending] = useState([])
  const [delivered, setDelivered] = useState([])
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

    const depositedIds = new Set((eventRows ?? []).filter((e) => e.event_type === 'item_deposited').map((e) => e.reservation_id))

    setPending((reservations ?? []).filter((r) => !depositedIds.has(r.id)))
    setDelivered((reservations ?? []).filter((r) => depositedIds.has(r.id)))
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

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <PageHeader backTo="/history" backLabel="Back to Activity" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-2xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-jet-black">Deliver your items</h1>
          <p className="mt-1 text-sm text-jet-black/50">Drop off confirmed rentals at their assigned locker.</p>

          {loading ? (
            <p className="mt-8 text-center text-sm text-jet-black/40">Loading…</p>
          ) : (
            <>
              <div className="mt-6 space-y-4">
                {pending.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-jet-black/5 bg-white py-12 text-center">
                    <Package className="h-8 w-8 text-jet-black/20" />
                    <p className="text-sm text-jet-black/50">Nothing waiting on you right now.</p>
                  </div>
                ) : (
                  pending.map((r) => <DeliveryForm key={r.id} reservation={r} onDelivered={handleDelivered} />)
                )}
              </div>

              {delivered.length > 0 && (
                <div className="mt-8">
                  <h2 className="text-sm font-semibold text-jet-black/60">Delivered — awaiting pickup</h2>
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

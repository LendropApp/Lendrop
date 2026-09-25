import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Camera, CheckCircle2, MapPin, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import StatusMessage from '../components/StatusMessage'
import LendropIdInput from '../components/LendropIdInput'
import { functionErrorMessage } from '../lib/functionError'

// The host's locker tasks: items to drop off, returns to collect, and
// items currently with renters. Each task card leads with where to go
// (locker and compartment) and then the two steps in order.

function LockerHeader({ reservation, who }) {
  const locker = reservation.compartment?.locker
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{reservation.item?.title}</p>
        <p className="text-sm text-text-muted">{who}</p>
        {locker && (
          <p className="mt-2 flex items-start gap-1.5 text-sm text-text-muted">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span>
              <span className="font-semibold text-text">{locker.name}</span> · {locker.address}, {locker.city}
            </span>
          </p>
        )}
      </div>
      {reservation.compartment?.compartment_code && (
        <div className="shrink-0 rounded-xl bg-surface-raised px-4 py-2 text-center">
          <p className="locker-code text-3xl font-medium text-text">{reservation.compartment.compartment_code}</p>
          <p className="text-xs text-text-muted">compartment</p>
        </div>
      )}
    </div>
  )
}

function StepLabel({ n, children }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-sm font-bold text-text">
      <span className="num flex h-6 w-6 items-center justify-center rounded-md bg-surface-raised text-sm text-primary" aria-hidden="true">
        {n}
      </span>
      {children}
    </p>
  )
}

function PhotoPicker({ id, file, preview, onChange, label, tone = 'default' }) {
  return (
    <div>
      <label
        htmlFor={id}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-sm ${
          tone === 'danger' ? 'border-danger/40 hover:border-danger' : 'border-border hover:border-primary'
        } ${file ? 'text-text' : 'text-text-muted'}`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
        ) : (
          <Camera className={`h-6 w-6 shrink-0 ${tone === 'danger' ? 'text-danger' : 'text-primary'}`} aria-hidden="true" />
        )}
        <span className="min-w-0 truncate">{file ? file.name : label}</span>
      </label>
      <input id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} required className="sr-only" />
    </div>
  )
}

function IdentityFields({ idPrefix, dui, setDui, lendropId, setLendropId }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-dui`} className="mb-1 block text-xs font-semibold text-text-muted">
          DUI
        </label>
        <input
          id={`${idPrefix}-dui`}
          type="text"
          value={dui}
          onChange={(e) => setDui(e.target.value)}
          placeholder="12345678-9"
          autoComplete="off"
          required
          className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-lendrop-id`} className="mb-1 block text-xs font-semibold text-text-muted">
          Lendrop ID
        </label>
        <LendropIdInput id={`${idPrefix}-lendrop-id`} value={lendropId} onChange={setLendropId} />
      </div>
    </div>
  )
}

function DeliveryForm({ reservation, onDelivered }) {
  const { user } = useAuth()
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [dui, setDui] = useState('')
  const [lendropId, setLendropId] = useState('')
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
      body: { reservationId: reservation.id, dui, lendropId, action: 'deposit' },
    })

    setSubmitting(false)

    if (error || data?.error) {
      setStatus({ type: 'error', text: await functionErrorMessage(error, data, 'Could not verify your identity. Please try again.') })
      return
    }

    setStatus({ type: 'success', text: 'Item marked as dropped off!' })
    onDelivered(reservation.id)
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <LockerHeader reservation={reservation} who={`For ${reservation.renter?.full_name ?? 'the renter'}`} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-5 border-t border-border pt-5">
        <div>
          <StepLabel n={1}>Photograph the item</StepLabel>
          <PhotoPicker
            id={`photo-${reservation.id}`}
            file={photo}
            preview={photoPreview}
            onChange={handlePhotoChange}
            label="Add a condition photo (required)"
          />
        </div>
        <div>
          <StepLabel n={2}>Confirm at the locker</StepLabel>
          <IdentityFields
            idPrefix={`deliver-${reservation.id}`}
            dui={dui}
            setDui={setDui}
            lendropId={lendropId}
            setLendropId={setLendropId}
          />
        </div>
        <div className="space-y-3">
          <StatusMessage type={status.type} text={status.text} />
          <button
            type="submit"
            disabled={submitting}
            className="cta-brand w-full rounded-xl px-5 py-3 text-sm font-bold text-soft-white disabled:opacity-50 sm:w-auto"
          >
            {submitting ? 'Verifying…' : 'Confirm drop-off'}
          </button>
        </div>
      </form>
    </article>
  )
}

function ReturnPickupForm({ reservation, onCompleted }) {
  const { user } = useAuth()
  const [dui, setDui] = useState('')
  const [lendropId, setLendropId] = useState('')
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
        lendropId,
        action: 'return_pickup',
        ...(reportingDamage ? { hasDamage: true, damageReason: damageReason.trim() } : {}),
      },
    })

    setSubmitting(false)

    if (error || data?.error) {
      setStatus({ type: 'error', text: await functionErrorMessage(error, data, 'Could not verify your identity. Please try again.') })
      return
    }

    setStatus({
      type: 'success',
      text: data?.disputed
        ? 'Damage reported. The deposit stays held while it is reviewed.'
        : 'Return confirmed. The rental is complete.',
    })
    onCompleted(reservation.id)
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <LockerHeader reservation={reservation} who={`Returned by ${reservation.renter?.full_name ?? 'the renter'}`} />

      <form onSubmit={handleSubmit} className="mt-5 space-y-5 border-t border-border pt-5">
        <div>
          <StepLabel n={1}>Check the item</StepLabel>
          {reportingDamage ? (
            <div className="space-y-3 rounded-xl border border-danger/30 bg-danger-soft p-4">
              <PhotoPicker
                id={`damage-photo-${reservation.id}`}
                file={damagePhoto}
                preview={damagePhotoPreview}
                onChange={handleDamagePhotoChange}
                label="Add a photo of the damage (required)"
                tone="danger"
              />
              <label htmlFor={`damage-reason-${reservation.id}`} className="sr-only">
                Describe the damage
              </label>
              <textarea
                id={`damage-reason-${reservation.id}`}
                value={damageReason}
                onChange={(e) => setDamageReason(e.target.value.slice(0, 500))}
                placeholder="Describe the damage…"
                rows={2}
                required
                className="w-full resize-none rounded-xl border border-danger/30 bg-surface px-3 py-2 text-sm outline-none focus:border-danger"
              />
              <button type="button" onClick={toggleDamageReport} className="text-sm font-semibold text-text-muted hover:text-text">
                It's fine, cancel the damage report
              </button>
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              Came back as it left?{' '}
              <button
                type="button"
                onClick={toggleDamageReport}
                className="inline-flex items-center gap-1 font-semibold text-danger hover:underline"
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Report damage instead
              </button>
            </p>
          )}
        </div>
        <div>
          <StepLabel n={2}>Confirm at the locker</StepLabel>
          <IdentityFields
            idPrefix={`collect-${reservation.id}`}
            dui={dui}
            setDui={setDui}
            lendropId={lendropId}
            setLendropId={setLendropId}
          />
        </div>
        <div className="space-y-3">
          <StatusMessage type={status.type} text={status.text} />
          <button
            type="submit"
            disabled={submitting}
            className={`w-full rounded-xl px-5 py-3 text-sm font-bold text-soft-white disabled:opacity-50 sm:w-auto ${
              reportingDamage ? 'bg-red-700 hover:bg-red-800' : 'cta-brand'
            }`}
          >
            {submitting ? 'Verifying…' : reportingDamage ? 'Submit damage report' : 'Confirm return pickup'}
          </button>
        </div>
      </form>
    </article>
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

  const counters = [
    { label: 'To drop off', value: pending.length, href: '#drop-off' },
    { label: 'To collect', value: returnPending.length, href: '#collect' },
    { label: 'With renters', value: delivered.length, href: '#with-renters' },
  ]
  const nothingToDo = pending.length === 0 && returnPending.length === 0

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Profile" />

      <div className="mx-auto max-w-3xl px-6 py-8 sm:px-10">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Drop-offs &amp; returns</h1>
        <p className="mt-2 text-sm text-text-muted">Everything you need to leave at or collect from a locker.</p>

        {loading ? (
          <p className="mt-10 text-center text-sm text-text-muted">Loading…</p>
        ) : (
          <>
            <ul className="mt-6 grid grid-cols-3 gap-3" aria-label="Summary">
              {counters.map((c) => (
                <li key={c.label}>
                  <a href={c.href} className="block rounded-2xl border border-border bg-surface p-4 hover:border-primary">
                    <p className="num text-3xl text-text">{c.value}</p>
                    <p className="text-xs text-text-muted">{c.label}</p>
                  </a>
                </li>
              ))}
            </ul>

            {nothingToDo && (
              <div className="mt-8 flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-12 text-center">
                <Package className="h-8 w-8 text-text-muted" aria-hidden="true" />
                <p className="font-bold">Nothing waiting on you right now</p>
                <p className="text-sm text-text-muted">New rentals show up here once they're paid.</p>
              </div>
            )}

            {pending.length > 0 && (
              <section id="drop-off" className="mt-10 scroll-mt-24" aria-labelledby="drop-off-title">
                <h2 id="drop-off-title" className="text-2xl font-extrabold">To drop off</h2>
                <div className="mt-4 space-y-4">
                  {pending.map((r) => (
                    <DeliveryForm key={r.id} reservation={r} onDelivered={handleDelivered} />
                  ))}
                </div>
              </section>
            )}

            {returnPending.length > 0 && (
              <section id="collect" className="mt-10 scroll-mt-24" aria-labelledby="collect-title">
                <h2 id="collect-title" className="text-2xl font-extrabold">Returned: collect it</h2>
                <div className="mt-4 space-y-4">
                  {returnPending.map((r) => (
                    <ReturnPickupForm key={r.id} reservation={r} onCompleted={handleReturnCompleted} />
                  ))}
                </div>
              </section>
            )}

            {delivered.length > 0 && (
              <section id="with-renters" className="mt-10 scroll-mt-24" aria-labelledby="with-renters-title">
                <h2 id="with-renters-title" className="text-2xl font-extrabold">With renters</h2>
                <ul className="mt-4 space-y-2">
                  {delivered.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold text-text">{r.item?.title}</span>
                        <span className="block text-text-muted">
                          In the locker, waiting for {r.renter?.full_name ?? 'the renter'} to pick it up.
                        </span>
                      </span>
                      {r.compartment?.compartment_code && (
                        <span className="locker-code shrink-0 text-lg text-text-muted">{r.compartment.compartment_code}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

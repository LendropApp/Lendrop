import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, CircleDashed, Clock, ImagePlus, ShieldCheck, Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { VERIFICATION_ACTIONS } from '../lib/verification'
import PageHeader from '../components/PageHeader'
import StatusMessage from '../components/StatusMessage'

const STATUS_COPY = {
  unverified: { label: 'Not verified', tone: 'text-text-muted', bg: 'bg-surface-raised' },
  pending: { label: 'Under review', tone: 'text-amber-700', bg: 'bg-amber-100' },
  verified: { label: 'Verified', tone: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'Needs attention', tone: 'text-red-600', bg: 'bg-red-100' },
}

const DOCUMENT_TYPES = [
  { value: 'dui', label: 'DUI' },
  { value: 'passport', label: 'Passport' },
]

// identity-documents is a PRIVATE bucket (migration 0019): a DUI photo is
// national-ID data, so it is never exposed through getPublicUrl. Paths are
// {auth.uid()}/... — the storage policy authorizes on that first segment.
const BUCKET = 'identity-documents'

function FileSlot({ id, label, hint, file, onPick, onClear, required }) {
  const inputRef = useRef(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  // Object URLs have to be revoked by hand, so they are created in an
  // effect (once per file) rather than inline during render.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-text">
        {label} {!required && <span className="font-normal text-text-muted">(optional)</span>}
      </label>
      {file ? (
        <div className="relative aspect-4/3 overflow-hidden rounded-xl border border-border bg-surface-raised">
          <img src={previewUrl} alt={`${label} preview`} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            aria-label={`Remove ${label}`}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-jet-black/60 text-soft-white backdrop-blur transition hover:bg-jet-black/80"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-4/3 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border text-text-muted transition hover:border-primary hover:bg-surface-raised hover:text-primary"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-[11px] font-medium">{hint}</span>
        </button>
      )}
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          const picked = e.target.files?.[0]
          e.target.value = ''
          if (picked) onPick(picked)
        }}
        className="hidden"
      />
    </div>
  )
}

export default function Verification() {
  const { user, profile, verificationStatus, refreshProfile } = useAuth()
  const location = useLocation()

  const [documentType, setDocumentType] = useState('dui')
  const [front, setFront] = useState(null)
  const [back, setBack] = useState(null)
  const [selfie, setSelfie] = useState(null)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

  // Set by VerifiedRoute / VerificationNotice when a blocked action sent
  // the user here, so the page opens by answering "why am I on this
  // screen?" instead of making them guess.
  const reason = location.state?.reason
  const reasonLabel = VERIFICATION_ACTIONS[reason]

  const statusCopy = STATUS_COPY[verificationStatus] ?? STATUS_COPY.unverified
  const canSubmit = verificationStatus === 'unverified' || verificationStatus === 'rejected'

  const steps = [
    { id: 'email', label: 'Email confirmed', done: Boolean(user?.email_confirmed_at) || Boolean(user) },
    { id: 'phone', label: 'Phone number', done: Boolean(profile?.phone) },
    {
      id: 'id',
      label: 'DUI document',
      done: verificationStatus === 'verified' || verificationStatus === 'pending',
    },
    { id: 'selfie', label: 'Selfie match', done: verificationStatus === 'verified' },
  ]
  const completedCount = steps.filter((s) => s.done).length

  async function uploadOne(file, slot) {
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${slot}-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type })
    return error ? null : path
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', text: '' })

    if (!front) {
      setStatus({ type: 'error', text: 'Add a photo of the front of your document.' })
      return
    }
    if (!selfie) {
      setStatus({ type: 'error', text: 'Add a selfie so we can match it to your document.' })
      return
    }

    setSubmitting(true)

    const [frontPath, backPath, selfiePath] = await Promise.all([
      uploadOne(front, 'front'),
      back ? uploadOne(back, 'back') : Promise.resolve(null),
      uploadOne(selfie, 'selfie'),
    ])

    if (!frontPath || !selfiePath) {
      setSubmitting(false)
      setStatus({ type: 'error', text: 'Could not upload your photos. Please try again.' })
      return
    }

    // The insert is all the client does — a trigger on
    // identity_verifications moves profiles.verification_status to
    // 'pending'. There is no update policy on this table for
    // authenticated users, so nobody can approve their own submission.
    const { error } = await supabase.from('identity_verifications').insert({
      user_id: user.id,
      document_type: documentType,
      document_front_path: frontPath,
      document_back_path: backPath,
      selfie_path: selfiePath,
    })

    setSubmitting(false)

    if (error) {
      setStatus({ type: 'error', text: 'Could not submit your documents. Please try again.' })
      return
    }

    setFront(null)
    setBack(null)
    setSelfie(null)
    setStatus({ type: 'success', text: 'Documents submitted. We’ll review them shortly.' })
    await refreshProfile()
  }

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Trust &amp; verification</h1>
          <p className="mt-1 text-sm text-text-muted">
            Verified members get more reservations and higher trust from lenders.
          </p>

          {reasonLabel && verificationStatus !== 'verified' && (
            <div className="mt-5 rounded-2xl border border-border bg-surface-raised p-4 text-sm text-text-muted">
              You need a verified identity to {reasonLabel} on Lendrop. Finish the steps below and
              you'll be able to continue.
            </div>
          )}

          <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck
                  className={`h-8 w-8 ${verificationStatus === 'verified' ? 'text-primary' : 'text-text-muted'}`}
                />
                <div>
                  <p className="font-display text-lg font-semibold text-text">Identity status</p>
                  <p className="text-xs text-text-muted">
                    {completedCount} of {steps.length} steps complete
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCopy.bg} ${statusCopy.tone}`}>
                {statusCopy.label}
              </span>
            </div>

            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface-raised">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>

            <ul className="mt-5 space-y-3 border-t border-border pt-5">
              {steps.map((step) => (
                <li key={step.id} className="flex items-center gap-3 text-sm">
                  {step.done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-primary" />
                  ) : (
                    <CircleDashed className="h-4.5 w-4.5 text-text-muted" />
                  )}
                  <span className={step.done ? 'text-text' : 'text-text-muted'}>{step.label}</span>
                </li>
              ))}
            </ul>

            {verificationStatus === 'pending' && (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                We're reviewing your documents. This usually takes less than 24 hours.
              </div>
            )}

            {verificationStatus === 'rejected' && (
              <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                Your last submission was rejected. Make sure the photo is sharp, the whole document
                is in frame, and your selfie clearly shows your face.
              </div>
            )}
          </section>

          {canSubmit && (
            <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-border bg-surface p-6">
              <p className="font-display text-sm font-semibold text-text">
                {verificationStatus === 'rejected' ? 'Submit new documents' : 'Start verification'}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Your documents are stored privately and are only visible to you and the reviewer.
              </p>

              <div className="mt-4">
                <span className="mb-2 block text-sm font-medium text-text">Document type</span>
                <div className="flex gap-2">
                  {DOCUMENT_TYPES.map((doc) => {
                    const active = documentType === doc.value
                    return (
                      <button
                        key={doc.value}
                        type="button"
                        onClick={() => setDocumentType(doc.value)}
                        className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                          active
                            ? 'border-transparent cta-brand text-soft-white glow-sm'
                            : 'border-border text-text-muted hover:border-primary hover:text-primary'
                        }`}
                      >
                        {doc.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <FileSlot
                  id="document-front"
                  label="Document front"
                  hint="Front side"
                  file={front}
                  onPick={setFront}
                  onClear={() => setFront(null)}
                  required
                />
                <FileSlot
                  id="document-back"
                  label="Document back"
                  hint="Back side"
                  file={back}
                  onPick={setBack}
                  onClear={() => setBack(null)}
                />
                <FileSlot
                  id="selfie"
                  label="Selfie"
                  hint="Your face"
                  file={selfie}
                  onPick={setSelfie}
                  onClear={() => setSelfie(null)}
                  required
                />
              </div>

              <div className="mt-5">
                <StatusMessage type={status.type} text={status.text} />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {submitting ? 'Submitting…' : 'Submit for review'}
              </button>
            </form>
          )}

          <section className="mt-4 rounded-2xl border border-border bg-surface p-6">
            <p className="font-display text-sm font-semibold text-text">Why verify?</p>
            <ul className="mt-3 space-y-2 text-sm text-text-muted">
              <li>• Required to publish an item or book a rental</li>
              <li>• Verified badge shown on your profile and listings</li>
              <li>• Priority placement when renters filter by "Verified only"</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { CheckCircle2, CircleDashed, Clock, ShieldCheck, Upload } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

const STATUS_COPY = {
  unverified: { label: 'Not verified', tone: 'text-jet-black/50', bg: 'bg-jet-black/5' },
  pending: { label: 'Under review', tone: 'text-amber-700', bg: 'bg-amber-100' },
  verified: { label: 'Verified', tone: 'text-emerald-700', bg: 'bg-emerald-100' },
  rejected: { label: 'Needs attention', tone: 'text-red-600', bg: 'bg-red-100' },
}

export default function Verification() {
  const { user, profile } = useAuth()
  const [submitted, setSubmitted] = useState(false)

  const verificationStatus = submitted ? 'pending' : (profile?.verification_status ?? 'unverified')
  const statusCopy = STATUS_COPY[verificationStatus] ?? STATUS_COPY.unverified

  const steps = [
    { id: 'email', label: 'Email confirmed', done: Boolean(user?.email_confirmed_at) || Boolean(user) },
    { id: 'phone', label: 'Phone number', done: Boolean(profile?.phone) },
    { id: 'id', label: 'DUI document', done: verificationStatus === 'verified' || verificationStatus === 'pending' },
    { id: 'selfie', label: 'Selfie match', done: verificationStatus === 'verified' },
  ]
  const completedCount = steps.filter((s) => s.done).length

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-jet-black">Trust &amp; verification</h1>
          <p className="mt-1 text-sm text-jet-black/50">
            Verified members get more reservations and higher trust from lenders.
          </p>

          <section className="mt-6 rounded-2xl border border-lavender/15 bg-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`h-8 w-8 ${verificationStatus === 'verified' ? 'text-deep-purple' : 'text-jet-black/20'}`} />
                <div>
                  <p className="font-display text-lg font-semibold text-jet-black">Identity status</p>
                  <p className="text-xs text-jet-black/45">{completedCount} of {steps.length} steps complete</p>
                </div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCopy.bg} ${statusCopy.tone}`}>
                {statusCopy.label}
              </span>
            </div>

            <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-jet-black/5">
              <div
                className="h-full rounded-full bg-deep-purple transition-all"
                style={{ width: `${(completedCount / steps.length) * 100}%` }}
              />
            </div>

            <ul className="mt-5 space-y-3 border-t border-jet-black/5 pt-5">
              {steps.map((step) => (
                <li key={step.id} className="flex items-center gap-3 text-sm">
                  {step.done ? (
                    <CheckCircle2 className="h-4.5 w-4.5 text-deep-purple" />
                  ) : (
                    <CircleDashed className="h-4.5 w-4.5 text-jet-black/25" />
                  )}
                  <span className={step.done ? 'text-jet-black' : 'text-jet-black/50'}>{step.label}</span>
                </li>
              ))}
            </ul>

            {verificationStatus === 'unverified' && (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/40 bg-deep-purple/70 backdrop-blur-md px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_28px_-10px_rgba(67,48,117,0.55)] transition hover:bg-deep-purple/80"
              >
                <Upload className="h-4 w-4" />
                Start verification (DUI + selfie)
              </button>
            )}

            {verificationStatus === 'pending' && (
              <div className="mt-6 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                <Clock className="h-4 w-4" />
                We're reviewing your documents. This usually takes less than 24 hours.
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-lavender/15 bg-white p-6">
            <p className="font-display text-sm font-semibold text-jet-black">Why verify?</p>
            <ul className="mt-3 space-y-2 text-sm text-jet-black/60">
              <li>• Verified badge shown on your profile and listings</li>
              <li>• Priority placement when renters filter by "Verified only"</li>
              <li>• Faster approval on reservation requests</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}

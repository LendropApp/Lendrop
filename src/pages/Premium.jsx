import { useState } from 'react'
import { BarChart3, Crown, Percent, Sparkles, Star } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const FEATURES = [
  { icon: Star, title: 'Priority placement', desc: 'Your listings appear first in Explore results.' },
  { icon: Percent, title: 'Lower service fees', desc: 'Reduced commission on every completed rental.' },
  { icon: BarChart3, title: 'Advanced stats', desc: 'Deeper demand insights and pricing suggestions.' },
  { icon: Crown, title: 'Premium badge', desc: 'A distinct badge shown on your profile and listings.' },
]

export default function Premium() {
  const [joined, setJoined] = useState(false)

  return (
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <div className="relative mx-auto max-w-3xl px-6 py-10 sm:px-10">
          <div className="brand-field rounded-2xl p-8 text-center sm:p-12">
            <Sparkles className="mx-auto h-8 w-8" aria-hidden="true" />
            <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">Lendrop Premium</h1>
            <p className="mt-2 text-soft-white/85">Coming soon</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl border border-border bg-surface p-5">
                <Icon className="h-5 w-5 text-primary" />
                <p className="mt-3 font-bold text-text">{title}</p>
                <p className="mt-1 text-sm text-text-muted">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-surface p-6 text-center">
            <p className="text-sm text-text-muted">
              Be the first to know when Premium launches for lenders in El Salvador.
            </p>
            <button
              type="button"
              disabled={joined}
              onClick={() => setJoined(true)}
              className="cta-brand mt-4 w-full rounded-xl px-5 py-3 text-sm font-bold text-soft-white disabled:cursor-default disabled:opacity-60"
            >
              {joined ? "You're on the waitlist" : 'Join the waitlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

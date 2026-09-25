import { useState } from 'react'
import { Moon, RotateCcw, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import PageHeader from '../components/PageHeader'
import RentalStatus from '../components/RentalStatus'
import SegmentedControl from '../components/SegmentedControl'
import Shutter from '../components/Shutter'
import StatusMessage from '../components/StatusMessage'

// Dev-only reference sheet for the shared design system (mounted only when
// import.meta.env.DEV). Every value shown is sample data.

const SWATCHES = [
  { name: 'Deep Purple', className: 'bg-deep-purple', note: 'shutter field, CTA' },
  { name: 'Lavender', className: 'bg-lavender', note: 'selection stamp' },
  { name: 'Steel', className: 'bg-steel', note: 'ribs, hairlines' },
  { name: 'Background', className: 'bg-bg border border-border', note: 'page ground' },
  { name: 'Surface', className: 'bg-surface border border-border', note: 'panels' },
  { name: 'Text', className: 'bg-text', note: 'body copy' },
]

const STATUSES = ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed']
const CATEGORIES = ['Cameras', 'Tools', 'Camping', 'Sports', 'Electronics']

function Section({ title, children }) {
  return (
    <section className="border-t border-border py-10">
      <h2 className="mb-6 text-xl font-bold">{title}</h2>
      {children}
    </section>
  )
}

export default function DesignSystem() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mode, setMode] = useState('rent')
  const [category, setCategory] = useState('Cameras')
  const [shutterKey, setShutterKey] = useState(0)
  const dark = resolvedTheme === 'dark'

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <PageHeader
        backTo="/"
        backLabel="Home"
        maxWidth="max-w-5xl"
        right={
          <button
            type="button"
            onClick={() => setTheme(dark ? 'light' : 'dark')}
            aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            className="rounded-lg p-2 text-text-muted hover:bg-surface-raised hover:text-primary"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-6 sm:px-10">
        <div className="py-12">
          <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-7xl">Rent it. Skip the meetup.</h1>
          <p className="mt-4 max-w-[60ch] text-text-muted">
            The shared system for the Rótulo Shutter redesign: lettering, colour, controls and
            states. Every value on this page is sample data.
          </p>
        </div>

        <Section title="The shutter">
          <Shutter key={shutterKey} label="Compartment B4" className="rounded-2xl border border-border">
            <div className="flex min-h-64 flex-col justify-end gap-2 bg-surface-raised p-6">
              <span className="locker-code text-sm text-text-muted">B4 · Downtown San Salvador</span>
              <p className="text-2xl font-bold">Canon EOS R50 kit</p>
              <p className="text-sm text-text-muted">Sample item behind the shutter.</p>
            </div>
          </Shutter>
          <button
            type="button"
            onClick={() => setShutterKey((k) => k + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:border-primary hover:text-primary"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Replay the roll-up
          </button>
        </Section>

        <Section title="Colour">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {SWATCHES.map((s) => (
              <div key={s.name}>
                <div className={`h-16 rounded-xl ${s.className}`} />
                <p className="mt-2 text-sm font-semibold">{s.name}</p>
                <p className="text-xs text-text-muted">{s.note}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Numbers">
          <div className="flex flex-wrap items-end gap-10">
            <div>
              <p className="num text-5xl">$12</p>
              <p className="text-sm text-text-muted">per day</p>
            </div>
            <div>
              <p className="num text-5xl">3</p>
              <p className="text-sm text-text-muted">days, Oct 4 – Oct 7</p>
            </div>
            <div>
              <p className="locker-code text-4xl font-medium">482 913</p>
              <p className="text-sm text-text-muted">pickup PIN</p>
            </div>
          </div>
        </Section>

        <Section title="Controls">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="cta-brand rounded-xl px-5 py-2.5 text-sm font-semibold text-soft-white">
              Reserve for $36
            </button>
            <button
              type="button"
              className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text hover:border-primary hover:text-primary"
            >
              Message host
            </button>
            <button type="button" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-primary hover:underline">
              View locker map
            </button>
            <button type="button" disabled className="cta-brand rounded-xl px-5 py-2.5 text-sm font-semibold text-soft-white disabled:opacity-50">
              Unavailable
            </button>
          </div>

          <div className="mt-8 grid max-w-md gap-4">
            <div>
              <label htmlFor="ds-email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="ds-email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>
            <StatusMessage type="error" text="That email is already registered. Log in instead." />
            <StatusMessage type="success" text="Password updated. You can log in now." />
          </div>

          <div className="mt-8 max-w-sm">
            <SegmentedControl
              label="What do you want to do?"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'rent', label: 'Rent' },
                { value: 'host', label: 'Host' },
              ]}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  category === c ? 'stamp' : 'border border-border text-text-muted hover:text-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Section>

        <Section title="Rental states">
          <ul className="grid gap-3 sm:grid-cols-3">
            {STATUSES.map((s) => (
              <li key={s} className="rounded-xl border border-border bg-surface px-4 py-3">
                <RentalStatus status={s} />
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  )
}

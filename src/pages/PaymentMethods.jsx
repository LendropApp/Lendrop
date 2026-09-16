import { useState } from 'react'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import AuroraBlobs from '../components/background/AuroraBlobs'

const BRAND_BY_PREFIX = [
  { prefix: '4', brand: 'Visa' },
  { prefix: '5', brand: 'Mastercard' },
  { prefix: '3', brand: 'Amex' },
]

function detectBrand(number) {
  const found = BRAND_BY_PREFIX.find((b) => number.startsWith(b.prefix))
  return found?.brand ?? 'Card'
}

export default function PaymentMethods() {
  const [methods, setMethods] = useState([
    { id: 'pm1', brand: 'Visa', last4: '4242', expiry: '08/28', isDefault: true },
  ])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ number: '', expiry: '', cvc: '', name: '' })

  function handleAdd(e) {
    e.preventDefault()
    const digits = form.number.replace(/\s/g, '')
    if (digits.length < 12 || !form.expiry || !form.cvc) return

    setMethods((prev) => [
      ...prev,
      {
        id: `pm-${Date.now()}`,
        brand: detectBrand(digits),
        last4: digits.slice(-4),
        expiry: form.expiry,
        isDefault: prev.length === 0,
      },
    ])
    setForm({ number: '', expiry: '', cvc: '', name: '' })
    setShowForm(false)
  }

  function handleRemove(id) {
    setMethods((prev) => prev.filter((m) => m.id !== id))
  }

  function handleSetDefault(id) {
    setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })))
  }

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-jet-black">Payment methods</h1>
          <p className="mt-1 text-sm text-jet-black/50">
            Saved cards are used to pay for reservations via Wompi checkout.
          </p>

          <div className="mt-6 space-y-3">
            {methods.map((m) => (
              <div key={m.id} className="flex items-center gap-4 rounded-2xl border border-lavender/15 bg-white p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-lavender/15">
                  <CreditCard className="h-5 w-5 text-deep-purple" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-jet-black">
                    {m.brand} •••• {m.last4}
                  </p>
                  <p className="text-xs text-jet-black/45">Expires {m.expiry}</p>
                </div>
                {m.isDefault ? (
                  <span className="shrink-0 rounded-full bg-lavender/15 px-3 py-1 text-xs font-semibold text-deep-purple">
                    Default
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(m.id)}
                    className="shrink-0 text-xs font-semibold text-deep-purple hover:text-lavender"
                  >
                    Make default
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Remove card"
                  onClick={() => handleRemove(m.id)}
                  className="shrink-0 text-jet-black/30 transition hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {showForm ? (
            <form onSubmit={handleAdd} className="mt-4 space-y-3 rounded-2xl border border-lavender/15 bg-white p-5">
              <div>
                <label className="text-xs font-semibold text-jet-black/60">Cardholder name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 text-sm focus:border-lavender focus:outline-none"
                  placeholder="Full name on card"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-jet-black/60">Card number</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  value={form.number}
                  onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
                  placeholder="4242 4242 4242 4242"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-jet-black/60">Expiry</label>
                  <input
                    type="text"
                    required
                    value={form.expiry}
                    onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
                    placeholder="MM/YY"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-jet-black/60">CVC</label>
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    value={form.cvc}
                    onChange={(e) => setForm((f) => ({ ...f, cvc: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-deep-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-purple/90"
                >
                  Save card
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm font-semibold text-jet-black/60 transition hover:border-jet-black/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-lavender/40 bg-white px-4 py-3.5 text-sm font-semibold text-deep-purple transition hover:border-lavender hover:bg-lavender/5"
            >
              <Plus className="h-4 w-4" />
              Add payment method
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

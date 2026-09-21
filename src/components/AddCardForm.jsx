import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

const BRAND_BY_PREFIX = [
  { prefix: '4', brand: 'Visa' },
  { prefix: '5', brand: 'Mastercard' },
  { prefix: '3', brand: 'Amex' },
]

function detectBrand(number) {
  const found = BRAND_BY_PREFIX.find((b) => number.startsWith(b.prefix))
  return found?.brand ?? 'Card'
}

// No real Wompi tokenization is wired up yet (that needs the sandbox
// public key + JS SDK from PLAN_MVP_70.md Fase 4) — this generates a local
// opaque placeholder token so the row still matches the payment_methods
// schema, which never stores a raw card number or CVC.
function generatePlaceholderToken() {
  return `local_${crypto.randomUUID()}`
}

// Shared "add a card" form — used standalone on PaymentMethods.jsx and
// inline in ItemDetail.jsx's booking flow when the renter has no saved
// card yet, so the logic (and the payment_methods schema it writes to)
// isn't duplicated between the two.
export default function AddCardForm({ onSaved, onCancel, makeDefault = false }) {
  const { user } = useAuth()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ number: '', expiry: '', cvc: '', name: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    const digits = form.number.replace(/\s/g, '')
    const [expiryMonthRaw, expiryYearRaw] = form.expiry.split('/')
    const expiryMonth = Number(expiryMonthRaw)
    const expiryYear = Number(expiryYearRaw)
    if (digits.length < 12 || !expiryMonth || !expiryYear || !form.cvc || !user) return

    setSaving(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        provider: 'manual',
        provider_token: generatePlaceholderToken(),
        brand: detectBrand(digits),
        last4: digits.slice(-4),
        expiry_month: expiryMonth,
        expiry_year: expiryYear < 100 ? 2000 + expiryYear : expiryYear,
        is_default: makeDefault,
      })
      .select('id, brand, last4, expiry_month, expiry_year, is_default')
      .single()

    setSaving(false)
    if (insertError) {
      setError('Could not save that card. Please try again.')
      return
    }
    setForm({ number: '', expiry: '', cvc: '', name: '' })
    onSaved?.(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-lavender/15 bg-white p-5">
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
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 rounded-xl bg-deep-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-purple/90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save card'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm font-semibold text-jet-black/60 transition hover:border-jet-black/20"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

// Real (if simplified) card BIN-range detection instead of a naive
// single-digit prefix check — matches how actual checkout forms tell
// Visa from Mastercard from Amex.
function detectBrand(digits) {
  if (!digits) return null
  if (/^4/.test(digits)) return 'Visa'
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  return null
}

function expectedCvcLength(brand) {
  return brand === 'Amex' ? 4 : 3
}

// Standard Luhn checksum — catches obviously-mistyped card numbers
// (transposed/mistyped digits) the way a real payment form would,
// without needing to actually reach a card network to check.
function passesLuhnCheck(digits) {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

// No real Wompi tokenization is wired up yet (that needs the sandbox
// public key + JS SDK from PLAN_MVP_70.md Fase 4) — this generates a local
// opaque placeholder token so the row still matches the payment_methods
// schema, which never stores a raw card number or CVC.
function generatePlaceholderToken() {
  return `local_${crypto.randomUUID()}`
}

function digitsOnly(value) {
  return value.replace(/\D/g, '')
}

// Shared "add a payment method" form — used standalone on
// PaymentMethods.jsx and inline in ItemDetail.jsx's booking flow when
// the renter has no saved method yet, so the logic (and the
// payment_methods schema it writes to) isn't duplicated between the
// two. Supports a card (Visa/Mastercard/Amex, BIN-detected + Luhn
// validated) or a simulated PayPal connection.
export default function AddCardForm({ onSaved, onCancel, makeDefault = false }) {
  const { user } = useAuth()
  const [method, setMethod] = useState('card') // 'card' | 'paypal'
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ number: '', expiry: '', cvc: '', name: '' })
  const [paypalEmail, setPaypalEmail] = useState('')

  const brand = detectBrand(form.number)

  async function savePaymentMethod(row) {
    setSaving(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('payment_methods')
      .insert({ user_id: user.id, is_default: makeDefault, ...row })
      .select('id, brand, last4, expiry_month, expiry_year, is_default')
      .single()

    setSaving(false)
    if (insertError) {
      setError('Could not save that payment method. Please try again.')
      return
    }
    onSaved?.(data)
  }

  async function handleCardSubmit(e) {
    e.preventDefault()
    if (!user) return

    if (!brand) {
      setError('Enter a valid Visa or Mastercard number.')
      return
    }
    if (form.number.length < 13 || form.number.length > 19 || !passesLuhnCheck(form.number)) {
      setError('That card number looks invalid. Please check it and try again.')
      return
    }
    if (form.cvc.length !== expectedCvcLength(brand)) {
      setError(`${brand} cards use a ${expectedCvcLength(brand)}-digit security code.`)
      return
    }
    if (!form.expiry) {
      setError('Pick the card’s expiry date.')
      return
    }
    const [expiryYearRaw, expiryMonthRaw] = form.expiry.split('-')
    const expiryYear = Number(expiryYearRaw)
    const expiryMonth = Number(expiryMonthRaw)
    const now = new Date()
    if (expiryYear < now.getFullYear() || (expiryYear === now.getFullYear() && expiryMonth < now.getMonth() + 1)) {
      setError('That card has already expired.')
      return
    }

    await savePaymentMethod({
      provider: 'manual',
      provider_token: generatePlaceholderToken(),
      brand,
      last4: form.number.slice(-4),
      expiry_month: expiryMonth,
      expiry_year: expiryYear,
    })
    setForm({ number: '', expiry: '', cvc: '', name: '' })
  }

  async function handlePaypalSubmit(e) {
    e.preventDefault()
    if (!user) return
    // Sandbox only — no real PayPal connection is made. The email is
    // just collected for the familiar "connect your account" feel;
    // payment_methods has no column for it, so it isn't persisted.
    await savePaymentMethod({
      provider: 'paypal',
      provider_token: generatePlaceholderToken(),
      brand: 'PayPal',
      last4: null,
      expiry_month: null,
      expiry_year: null,
    })
    setPaypalEmail('')
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <div className="flex gap-1 rounded-xl border border-border bg-surface-raised p-1" role="group" aria-label="Payment method type">
        <button
          type="button"
          onClick={() => setMethod('card')}
          aria-pressed={method === 'card'}
          className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${
            method === 'card' ? 'stamp' : 'text-text-muted hover:text-text'
          }`}
        >
          Card
        </button>
        <button
          type="button"
          onClick={() => setMethod('paypal')}
          aria-pressed={method === 'paypal'}
          className={`flex-1 rounded-lg py-1.5 text-sm font-semibold ${
            method === 'paypal' ? 'stamp' : 'text-text-muted hover:text-text'
          }`}
        >
          PayPal
        </button>
      </div>

      {method === 'card' ? (
        <form onSubmit={handleCardSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-text-muted">Cardholder name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="Full name on card"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-muted">Card number</label>
              {brand && <span className="text-xs font-semibold text-primary">{brand}</span>}
            </div>
            <input
              type="text"
              required
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={19}
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: digitsOnly(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
              placeholder="4242424242424242"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-text-muted">Expiry</label>
              <input
                type="month"
                required
                min={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                value={form.expiry}
                onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-text-muted">CVC</label>
              <input
                type="text"
                required
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={expectedCvcLength(brand)}
                value={form.cvc}
                onChange={(e) => setForm((f) => ({ ...f, cvc: digitsOnly(e.target.value) }))}
                className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
                placeholder="123"
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="cta-brand flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-soft-white disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save card'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="cta-outline rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <form onSubmit={handlePaypalSubmit} className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-surface-raised p-3 text-xs text-text-muted">
            <CreditCard className="h-4 w-4 shrink-0 text-primary" />
            Sandbox: this simulates connecting a PayPal account — no real PayPal login happens.
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted">PayPal email</label>
            <input
              type="email"
              required
              value={paypalEmail}
              onChange={(e) => setPaypalEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="cta-brand flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-soft-white disabled:opacity-60"
            >
              {saving ? 'Connecting…' : 'Connect PayPal'}
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="cta-outline rounded-xl px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

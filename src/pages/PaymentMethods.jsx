import { useEffect, useState } from 'react'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
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

// No real Wompi tokenization is wired up yet (that needs the sandbox
// public key + JS SDK from PLAN_MVP_70.md Fase 4) — this generates a local
// opaque placeholder token so the row still matches the payment_methods
// schema, which never stores a raw card number or CVC.
function generatePlaceholderToken() {
  return `local_${crypto.randomUUID()}`
}

export default function PaymentMethods() {
  const { user } = useAuth()

  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ number: '', expiry: '', cvc: '', name: '' })

  useEffect(() => {
    if (!user) {
      setMethods([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('payment_methods')
      .select('id, brand, last4, expiry_month, expiry_year, is_default')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError('Could not load your payment methods. Please refresh.')
        else setMethods(data ?? [])
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleAdd(e) {
    e.preventDefault()
    const digits = form.number.replace(/\s/g, '')
    const [expiryMonthRaw, expiryYearRaw] = form.expiry.split('/')
    const expiryMonth = Number(expiryMonthRaw)
    const expiryYear = Number(expiryYearRaw)
    if (digits.length < 12 || !expiryMonth || !expiryYear || !form.cvc || !user) return

    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        user_id: user.id,
        provider: 'manual',
        provider_token: generatePlaceholderToken(),
        brand: detectBrand(digits),
        last4: digits.slice(-4),
        expiry_month: expiryMonth,
        expiry_year: expiryYear < 100 ? 2000 + expiryYear : expiryYear,
        is_default: methods.length === 0,
      })
      .select('id, brand, last4, expiry_month, expiry_year, is_default')
      .single()

    setSaving(false)
    if (error) {
      setError('Could not save that card. Please try again.')
      return
    }
    setMethods((prev) => [...prev, data])
    setForm({ number: '', expiry: '', cvc: '', name: '' })
    setShowForm(false)
  }

  async function handleRemove(id) {
    const previous = methods
    setMethods((prev) => prev.filter((m) => m.id !== id))
    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (error) setMethods(previous)
  }

  async function handleSetDefault(id) {
    const previous = methods
    setMethods((prev) => prev.map((m) => ({ ...m, is_default: m.id === id })))
    const { error } = await supabase.from('payment_methods').update({ is_default: true }).eq('id', id)
    if (error) setMethods(previous)
  }

  return (
    <div className="min-h-screen bg-soft-white pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-jet-black">Payment methods</h1>
          <p className="mt-1 text-sm text-jet-black/50">
            Saved cards are stored as brand, last 4 digits, and expiry only, never the full card number.
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="mt-8 text-center text-sm text-jet-black/40">Loading payment methods…</p>
          ) : (
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
                    <p className="text-xs text-jet-black/45">
                      Expires {String(m.expiry_month).padStart(2, '0')}/{String(m.expiry_year).slice(-2)}
                    </p>
                  </div>
                  {m.is_default ? (
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

              {methods.length === 0 && !showForm && (
                <p className="py-4 text-center text-sm text-jet-black/40">
                  You haven't added a payment method yet.
                </p>
              )}
            </div>
          )}

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
                  disabled={saving}
                  className="flex-1 rounded-xl bg-deep-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-purple/90 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save card'}
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

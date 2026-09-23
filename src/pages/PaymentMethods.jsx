import { useEffect, useState } from 'react'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'
import PageHeader from '../components/PageHeader'
import AddCardForm from '../components/AddCardForm'
import AuroraBlobs from '../components/background/AuroraBlobs'

export default function PaymentMethods() {
  const { user } = useAuth()

  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

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

  function handleCardSaved(newMethod) {
    setMethods((prev) => [...prev, newMethod])
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
    <div className="min-h-screen bg-bg pb-28 md:pb-16">
      <PageHeader backTo="/profile" backLabel="Back to Profile" />

      <div className="relative isolate overflow-hidden">
        <AuroraBlobs className="opacity-25" />
        <div className="relative mx-auto max-w-3xl px-6 py-8 sm:px-10">
          <h1 className="font-display text-2xl font-bold text-text">Payment methods</h1>
          <p className="mt-1 text-sm text-text-muted">
            Saved cards are stored as brand, last 4 digits, and expiry only, never the full card number.
          </p>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="mt-8 text-center text-sm text-text-muted">Loading payment methods…</p>
          ) : (
            <div className="mt-6 space-y-3">
              {methods.map((m) => (
                <div key={m.id} className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">
                      {m.last4 ? `${m.brand} •••• ${m.last4}` : m.brand}
                    </p>
                    <p className="text-xs text-text-muted">
                      {m.expiry_month && m.expiry_year
                        ? `Expires ${String(m.expiry_month).padStart(2, '0')}/${String(m.expiry_year).slice(-2)}`
                        : 'Connected'}
                    </p>
                  </div>
                  {m.is_default ? (
                    <span className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold text-primary">
                      Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(m.id)}
                      className="shrink-0 text-xs font-semibold text-primary hover:underline"
                    >
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Remove card"
                    onClick={() => handleRemove(m.id)}
                    className="shrink-0 text-text-muted transition hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {methods.length === 0 && !showForm && (
                <p className="py-4 text-center text-sm text-text-muted">
                  You haven't added a payment method yet.
                </p>
              )}
            </div>
          )}

          {showForm ? (
            <div className="mt-4">
              <AddCardForm
                onSaved={handleCardSaved}
                onCancel={() => setShowForm(false)}
                makeDefault={methods.length === 0}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-surface-raised"
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

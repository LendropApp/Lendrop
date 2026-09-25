import { useEffect, useState } from 'react'
import { Copy, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { formatLendropId } from '../lib/lendropId'
import { functionErrorMessage } from '../lib/functionError'
import PasswordInput from './PasswordInput'
import StatusMessage from './StatusMessage'

/**
 * The signed-in user's private Lendrop ID (profile_private.lendrop_id,
 * readable only by its owner through RLS). Hidden until revealed; can be
 * copied, and replaced after confirming the account password (the
 * lendrop-id Edge Function).
 */
export default function LendropIdCard({ userId }) {
  const [code, setCode] = useState(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const [resetting, setResetting] = useState(false)
  const [password, setPassword] = useState('')
  const [working, setWorking] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })

  useEffect(() => {
    if (!userId) return undefined
    let cancelled = false
    supabase
      .from('profile_private')
      .select('lendrop_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.lendrop_id) setMissing(true)
        else setCode(data.lendrop_id)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatLendropId(code))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setRevealed(true)
      setStatus({ type: 'error', text: 'Copying is blocked in this browser. The ID is shown above.' })
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setWorking(true)
    setStatus({ type: '', text: '' })
    const { data, error } = await supabase.functions.invoke('lendrop-id', { body: { password } })
    setWorking(false)

    if (error || !data?.lendropId) {
      setStatus({ type: 'error', text: await functionErrorMessage(error, data, 'Could not create a new Lendrop ID.') })
      return
    }

    setCode(data.lendropId)
    setRevealed(true)
    setResetting(false)
    setPassword('')
    setStatus({ type: 'success', text: 'New Lendrop ID ready. Your old one no longer opens lockers.' })
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8" aria-labelledby="lendrop-id-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="lendrop-id-title" className="text-xl font-extrabold">
            Your Lendrop ID
          </h2>
          <p className="mt-1 max-w-[52ch] text-sm text-text-muted">
            Enter it with your DUI at the locker to open your compartment. Keep it to yourself: Lendrop
            will never ask you for it.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-text-muted">Loading…</p>
      ) : missing ? (
        <p className="mt-6 rounded-xl bg-surface-raised p-4 text-sm text-text-muted">
          Your Lendrop ID isn't available yet. Try again in a moment, or contact support if it doesn't
          appear.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <p
              className="locker-code rounded-xl bg-surface-raised px-5 py-3 text-3xl font-medium tracking-[0.25em] text-text sm:text-4xl"
              aria-live="polite"
            >
              {revealed ? formatLendropId(code) : '•••-•••'}
              {!revealed && <span className="sr-only">Hidden</span>}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRevealed((r) => !r)}
                className="cta-outline flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                {revealed ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                {revealed ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="cta-outline flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {resetting ? (
            <form onSubmit={handleReset} className="mt-6 space-y-3 border-t border-border pt-5">
              <p className="text-sm text-text-muted">
                Confirm your account password to get a new Lendrop ID. The current one will stop working.
              </p>
              <label htmlFor="lendrop-id-password" className="sr-only">
                Account password
              </label>
              <PasswordInput
                id="lendrop-id-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Account password"
                autoComplete="current-password"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={working || !password}
                  className="cta-brand rounded-xl px-5 py-2.5 text-sm font-bold text-soft-white disabled:opacity-50"
                >
                  {working ? 'Checking…' : 'Get a new Lendrop ID'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetting(false)
                    setPassword('')
                    setStatus({ type: '', text: '' })
                  }}
                  className="cta-outline rounded-xl px-5 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setResetting(true)}
              className="mt-5 flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Someone saw it? Get a new Lendrop ID
            </button>
          )}
        </>
      )}

      <div className="mt-4" aria-live="polite">
        <StatusMessage type={status.type} text={status.text} />
      </div>
    </section>
  )
}

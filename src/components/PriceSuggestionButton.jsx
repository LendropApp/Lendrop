import { useState } from 'react'
import { Sparkles, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

// Copilot-style, opt-in price suggestion for PublishItem — never
// auto-triggers, never blocks publishing if it fails.
export default function PriceSuggestionButton({ category, description, condition, onApply }) {
  const [state, setState] = useState('idle') // idle | loading | result | error
  const [suggestion, setSuggestion] = useState(null)

  const eligible = Boolean(category) && description.trim().length >= 10
  if (!eligible) return null

  async function handleClick() {
    setState('loading')
    const { data, error } = await supabase.functions.invoke('suggest-price', {
      body: { category, description, condition },
    })

    if (error || data?.error) {
      setState('error')
      return
    }

    setSuggestion(data)
    setState('result')
  }

  function handleApply() {
    if (!suggestion) return
    const midpoint = Math.round(((suggestion.min + suggestion.max) / 2) * 100) / 100
    onApply(midpoint)
    setState('idle')
    setSuggestion(null)
  }

  function handleDismiss() {
    setState('idle')
    setSuggestion(null)
  }

  if (state === 'result' && suggestion) {
    return (
      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-xs text-text-muted">
            Suggestion:{' '}
            <span className="font-mono font-semibold text-primary">
              ${suggestion.min}–${suggestion.max}
            </span>{' '}
            <span className="text-text-muted">/ day</span>
          </p>
          {suggestion.reasoning && <p className="mt-0.5 truncate text-[11px] text-text-muted">{suggestion.reasoning}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
          >
            <Check className="h-3 w-3" />
            Use this price
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss suggestion"
            className="flex items-center justify-center rounded-full p-1.5 text-text-muted transition hover:bg-surface-raised hover:text-text-muted"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={state === 'loading'}
        className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary hover:bg-surface-raised disabled:opacity-60"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {state === 'loading' ? 'Thinking…' : 'Suggest a price'}
      </button>
      {state === 'error' && (
        <p className="mt-1 text-[11px] text-text-muted">Could not get a price suggestion right now.</p>
      )}
    </div>
  )
}

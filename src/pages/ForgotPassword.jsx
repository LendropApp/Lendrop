import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPassword() {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setIsSubmitting(true)
    await resetPasswordForEmail(email)
    setIsSubmitting(false)
    
    setSent(true)
  }

  return (
    <AuthLayout eyebrow="Recover access">
      <p className="mb-1 text-center font-display text-lg font-semibold text-primary">
        Reset your password
      </p>

      {sent ? (
        <p className="mt-4 text-center text-sm text-text-muted">
          If <strong>{email}</strong> is registered, we sent a link to reset
          your password.
        </p>
      ) : (
        <>
          <p className="mb-6 text-center text-sm text-text-muted">
            We&rsquo;ll send a link to your email to create a new one.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-lavender/30"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl cta-brand py-2.5 text-sm font-semibold text-soft-white glow-sm transition hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending…' : 'Send link'}
            </button>
          </form>
        </>
      )}

      <p className="mt-6 text-center">
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          ← Back to log in
        </Link>
      </p>
    </AuthLayout>
  )
}

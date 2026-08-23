import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import AuthTabs from '../components/AuthTabs'
import PasswordInput from '../components/PasswordInput'
import StatusMessage from '../components/StatusMessage'

const MIN_AGE = 18

/** Formats DUI input as the user types: 12345678-9 (8 digits + check digit). */
function formatDui(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 9)
  if (digits.length <= 8) return digits
  return `${digits.slice(0, 8)}-${digits.slice(8)}`
}

function isAdult(dateString) {
  if (!dateString) return false
  const birthDate = new Date(dateString)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1
  }
  return age >= MIN_AGE
}

export default function Signup() {
  const { signUp } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [dui, setDui] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Nobody can pick a birth date that would make them younger than 18 —
  // this restricts the date picker itself, on top of the submit check below.
  const maxBirthDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - MIN_AGE)
    return d.toISOString().split('T')[0]
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', text: '' })

    if (!/^\d{8}-\d{1}$/.test(dui)) {
      setStatus({ type: 'error', text: 'Enter a valid DUI in the format 12345678-9.' })
      return
    }
    if (!isAdult(dateOfBirth)) {
      setStatus({ type: 'error', text: `You must be at least ${MIN_AGE} years old to create an account.` })
      return
    }
    if (password !== confirmPassword) {
      setStatus({ type: 'error', text: 'Passwords don\u2019t match.' })
      return
    }
    if (password.length < 8) {
      setStatus({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (!agreedToTerms) {
      setStatus({ type: 'error', text: 'You need to accept the Terms of Service and Privacy Policy.' })
      return
    }

    setIsSubmitting(true)
    const { error } = await signUp({ email, password, fullName, dui, dateOfBirth, agreedToTerms })
    setIsSubmitting(false)

    if (error) {
      setStatus({
        type: 'error',
        text:
          error.message === 'User already registered'
            ? 'An account with that email already exists.'
            : error.message?.includes('profile_private_dui_key')
              ? 'That DUI is already registered to another account.'
              : 'Something went wrong while creating your account. Please try again.',
      })
      return
    }

    // Supabase requires email verification before the first login, so
    // we show a "check your inbox" state in the same card.
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthLayout>
        <div className="text-center">
          <p className="mb-2 font-display text-lg font-semibold text-deep-purple">
            Check your email
          </p>
          <p className="text-sm text-jet-black/60">
            We sent a verification link to <strong>{email}</strong>. Confirm it
            to be able to log in.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block text-sm font-medium text-deep-purple hover:text-lavender"
          >
            Back to log in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <AuthTabs active="signup" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Diego Martínez"
            className="w-full rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="dui" className="mb-1 block text-sm font-medium">
              DUI
            </label>
            <input
              id="dui"
              type="text"
              required
              inputMode="numeric"
              value={dui}
              onChange={(e) => setDui(formatDui(e.target.value))}
              placeholder="12345678-9"
              maxLength={10}
              className="locker-code w-full rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="mb-1 block text-sm font-medium">
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              type="date"
              required
              max={maxBirthDate}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-xl border border-jet-black/10 px-4 py-2.5 text-sm outline-none transition focus:border-lavender focus:ring-2 focus:ring-lavender/30"
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-jet-black/45">
          Used to verify your identity for rentals. You must be {MIN_AGE}+ to use Lendrop.
        </p>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            Confirm password
          </label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <label className="flex items-start gap-2.5 pt-1 text-sm text-jet-black/70">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-jet-black/20 text-deep-purple focus:ring-lavender/40"
          />
          {/* Plain text for now, not links — /terms and /privacy don't exist
              yet. Swap these spans for <Link> once those pages are built. */}
          <span>
            I agree to the <span className="font-medium text-deep-purple">Terms of Service</span> and{' '}
            <span className="font-medium text-deep-purple">Privacy Policy</span>.
          </span>
        </label>

        <StatusMessage type={status.type} text={status.text} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-deep-purple py-2.5 text-sm font-semibold text-soft-white transition hover:bg-deep-purple/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </AuthLayout>
  )
}

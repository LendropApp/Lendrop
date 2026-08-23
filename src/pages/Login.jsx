import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import AuthTabs from '../components/AuthTabs'
import PasswordInput from '../components/PasswordInput'
import StatusMessage from '../components/StatusMessage'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname || '/dashboard'

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', text: '' })
    setIsSubmitting(true)

    const { error } = await signIn({ email, password })
    setIsSubmitting(false)

    if (error) {
      setStatus({
        type: 'error',
        text:
          error.message === 'Invalid login credentials'
            ? 'Incorrect email or password.'
            : error.message === 'Email not confirmed'
              ? 'You need to verify your email before logging in.'
              : 'Something went wrong while logging in. Please try again.',
      })
      return
    }

    navigate(redirectTo, { replace: true })
  }

  return (
    <AuthLayout>
      <AuthTabs active="login" />

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-right">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-deep-purple hover:text-lavender"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        <StatusMessage type={status.type} text={status.text} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-deep-purple py-2.5 text-sm font-semibold text-soft-white transition hover:bg-deep-purple/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}

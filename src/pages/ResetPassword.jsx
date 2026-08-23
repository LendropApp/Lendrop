import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import StatusMessage from '../components/StatusMessage'


export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState({ type: '', text: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus({ type: '', text: '' })

    if (password.length < 8) {
      setStatus({ type: 'error', text: 'Password must be at least 8 characters.' })
      return
    }
    if (password !== confirmPassword) {
      setStatus({ type: 'error', text: 'Passwords don\u2019t match.' })
      return
    }

    setIsSubmitting(true)
    const { error } = await updatePassword(password)
    setIsSubmitting(false)

    if (error) {
      setStatus({ type: 'error', text: 'Couldn\u2019t update the password. Request a new link.' })
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout eyebrow="Recover access">
      <p className="mb-1 text-center font-display text-lg font-semibold text-deep-purple">
        New password
      </p>
      <p className="mb-6 text-center text-sm text-jet-black/60">
        Choose a secure password for your account.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            New password
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

        <StatusMessage type={status.type} text={status.text} />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-deep-purple py-2.5 text-sm font-semibold text-soft-white transition hover:bg-deep-purple/90 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthLayout>
  )
}

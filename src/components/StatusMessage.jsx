import { CircleAlert, CircleCheck } from 'lucide-react'

export default function StatusMessage({ type, text }) {
  if (!text) return null

  const success = type === 'success'
  const Icon = success ? CircleCheck : CircleAlert

  return (
    <p
      role={success ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
        success ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {text}
    </p>
  )
}

import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function PageHeader({ backTo = '/profile', backLabel = 'Back', right = null, maxWidth = 'max-w-3xl' }) {
  return (
    <header className="sticky top-0 z-50 border-b border-jet-black/5 bg-soft-white/85 backdrop-blur-md">
      <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
      <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-3 px-6 py-4 sm:px-10`}>
        <Link
          to={backTo}
          aria-label={`Back to ${backLabel}`}
          className="flex items-center gap-2 text-sm font-medium text-jet-black/60 transition hover:text-deep-purple"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
        <div className="flex w-24 justify-end">{right}</div>
      </div>
    </header>
  )
}

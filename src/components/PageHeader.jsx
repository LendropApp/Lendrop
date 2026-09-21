import { ArrowLeft } from 'lucide-react'
import useSmartBack from '../hooks/useSmartBack'
import MobileNav from './MobileNav'

export default function PageHeader({ backTo = '/profile', backLabel = 'Back', right = null, maxWidth = 'max-w-3xl' }) {
  const goBack = useSmartBack(backTo)

  return (
    <header className="glass sticky top-0 z-50">
      <div className="h-px bg-linear-to-r from-transparent via-lavender/50 to-transparent" />
      <div className={`mx-auto flex ${maxWidth} items-center justify-between gap-3 px-6 py-4 sm:px-10`}>
        <button
          type="button"
          onClick={goBack}
          aria-label={`Back to ${backLabel}`}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-jet-black/60 transition hover:bg-lavender/10 hover:text-deep-purple"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
        <img src="/logo-lendrop.png" alt="Lendrop" className="h-7 w-auto" />
        {/* The hamburger lives in the right slot on mobile — MobileNav
            hides itself on md and up, and for signed-out visitors. */}
        <div className="flex w-24 items-center justify-end gap-2">
          {right}
          <MobileNav />
        </div>
      </div>
    </header>
  )
}

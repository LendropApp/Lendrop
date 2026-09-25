import { Link } from 'react-router-dom'


export default function AuthTabs({ active }) {
  return (
    <div className="relative mb-8 flex rounded-full bg-surface-raised p-1">
      <span
        className="cta-brand absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: active === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}
        aria-hidden="true"
      />
      <Link
        to="/login"
        replace
        className={`relative z-10 flex-1 rounded-full py-2 text-center text-sm font-medium transition-colors ${
          active === 'login' ? 'text-soft-white' : 'text-text-muted hover:text-text'
        }`}
      >
        Log in
      </Link>
      <Link
        to="/signup"
        replace
        className={`relative z-10 flex-1 rounded-full py-2 text-center text-sm font-medium transition-colors ${
          active === 'signup' ? 'text-soft-white' : 'text-text-muted hover:text-text'
        }`}
      >
        Sign up
      </Link>
    </div>
  )
}

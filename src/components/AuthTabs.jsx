import { Link } from 'react-router-dom'


export default function AuthTabs({ active }) {
  return (
    <div className="relative mb-8 flex rounded-full bg-surface-raised p-1">
      <span
        className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-surface shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: active === 'signup' ? 'translateX(100%)' : 'translateX(0)' }}
        aria-hidden="true"
      />
      <Link
        to="/login"
        replace
        className={`relative z-10 flex-1 rounded-full py-2 text-center text-sm font-medium transition-colors ${
          active === 'login' ? 'text-primary' : 'text-text-muted hover:text-text-muted'
        }`}
      >
        Log in
      </Link>
      <Link
        to="/signup"
        replace
        className={`relative z-10 flex-1 rounded-full py-2 text-center text-sm font-medium transition-colors ${
          active === 'signup' ? 'text-primary' : 'text-text-muted hover:text-text-muted'
        }`}
      >
        Sign up
      </Link>
    </div>
  )
}

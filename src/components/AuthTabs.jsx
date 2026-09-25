import { Link } from 'react-router-dom'

export default function AuthTabs({ active }) {
  const tab = (key) =>
    `flex-1 rounded-lg py-2 text-center text-sm font-semibold ${
      active === key ? 'stamp' : 'text-text-muted hover:text-text'
    }`

  return (
    <div className="mb-8 flex gap-1 rounded-xl border border-border bg-surface-raised p-1">
      <Link to="/login" replace aria-current={active === 'login' ? 'page' : undefined} className={tab('login')}>
        Log in
      </Link>
      <Link to="/signup" replace aria-current={active === 'signup' ? 'page' : undefined} className={tab('signup')}>
        Sign up
      </Link>
    </div>
  )
}

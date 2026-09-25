import { Link } from 'react-router-dom'
import Logo from './Logo'

/**
 * Auth screens sit on the brand shutter: a full-bleed ribbed Deep Purple
 * field with one solid panel on it. The field stays purple in both themes
 * (it is --brand-surface); the panel follows the theme.
 */
export default function AuthLayout({ subtitle = null, children }) {
  return (
    <div className="shutter flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="glow-lg w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-text sm:max-w-md lg:max-w-xl lg:p-10">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <Logo className="h-10" />
          </Link>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        </div>

        {children}
      </div>
    </div>
  )
}

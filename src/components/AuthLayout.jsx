import LockerWallBg from '../components/background/LockerWallBg'
import { Link } from 'react-router-dom'


export default function AuthLayout({ eyebrow = 'Smart locker network', children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-jet-black px-4 py-12">
      {/* Grid pattern, on-brand lavender lines at low opacity */}
      {/* Grid pattern, on-brand lavender lines at low opacity */}
        <LockerWallBg className="pointer-events-none absolute inset-0" />
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-lavender/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-deep-purple/50 blur-3xl"
      />

      <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-lavender/10">
        <div className="mb-8 text-center">
          <Link to="/" className="font-display text-2xl font-bold text-deep-purple">
            Lendrop
          </Link>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-lavender">
            {eyebrow}
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}

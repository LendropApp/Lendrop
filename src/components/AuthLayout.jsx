import LockerWallBg from '../components/background/LockerWallBg'
import AuroraBlobs from '../components/background/AuroraBlobs'
import { Link } from 'react-router-dom'


export default function AuthLayout({ eyebrow = 'Smart locker network', children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-jet-black px-4 py-12">
      {/* Grid pattern, on-brand lavender lines at low opacity */}
      <LockerWallBg className="pointer-events-none absolute inset-0" />
      <AuroraBlobs className="opacity-80" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-white/90 p-8 shadow-2xl shadow-lavender/20 backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-lavender to-transparent" />

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

import LockerWallBg from '../components/background/LockerWallBg'
import AuroraBlobs from '../components/background/AuroraBlobs'
import { Link } from 'react-router-dom'


export default function AuthLayout({ eyebrow = 'Smart locker network', children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-jet-black via-[#241a42] to-jet-black px-4 py-12">
      {/* Grid pattern, on-brand lavender lines at low opacity */}
      <LockerWallBg
        className="pointer-events-none absolute inset-0"
        accentColor="165, 140, 244"
      />
      <AuroraBlobs className="opacity-100" />
      {/* Extra ambient wash, lighter/wider than AuroraBlobs' two corner blobs,
          for a brighter, more atmospheric backdrop behind the card. */}
      <div
        aria-hidden="true"
        className="animate-aurora pointer-events-none absolute left-1/2 top-1/3 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lavender/20 blur-[100px]"
        style={{ animationDelay: '-4s' }}
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-white/80 p-8 shadow-2xl shadow-lavender/25 backdrop-blur-xl sm:max-w-md lg:max-w-xl lg:p-10">
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

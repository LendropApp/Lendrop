import { Link } from 'react-router-dom'
import { Box, Calendar, CheckCircle2 } from 'lucide-react'

// TODO: Supabase - traer reserva real (reemplazar mockReservations)
const mockReservations = [
  {
    id: 1,
    articulo: 'Bicicleta de montaña',
    fecha: '2026-09-05',
    precio: 12.5,
    locker: 'A-14',
  },
  {
    id: 2,
    articulo: 'Taladro inalámbrico',
    fecha: '2026-09-08',
    precio: 7.0,
    locker: 'B-03',
  },
]

export default function BookingConfirmation() {
  return (
    <div className="min-h-screen bg-soft-white pb-24">
      {/* Navbar */}
      <nav className="border-b border-jet-black/10 bg-soft-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-10 w-auto"
            />
          </div>
        </div>
      </nav>

      {/* ================= TITLE ================= */}
      <section className="mx-auto max-w-6xl px-6 pt-10 sm:px-10">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-lavender" strokeWidth={2} />
          <h1 className="font-display text-2xl font-bold text-jet-black sm:text-3xl">
            Booking confirmed
          </h1>
        </div>
        <p className="mt-1 font-body text-sm text-jet-black/50">
          Here's a summary of your reservation. Pick up your item from the locker shown below.
        </p>
      </section>

      {/* ================= RESERVATIONS ================= */}
      <section className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {mockReservations.map((res) => (
            <ReservationCard key={res.id} reservation={res} />
          ))}
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-jet-black/10 bg-soft-white px-6 py-6 text-center sm:px-10">
        <Link
          to="/explore"
          className="inline-block rounded-full bg-deep-purple px-8 py-3 font-body text-sm font-semibold text-soft-white transition hover:bg-deep-purple/90"
        >
          Back to Explore
        </Link>
        <p className="mt-2">
            <a  
            href="#"
            className="font-body text-sm font-medium text-jet-black/50 hover:text-deep-purple"
        >
            Need help?
          </a>
        </p>
      </footer>
    </div>
  )
}

function ReservationCard({ reservation }) {
  const formattedDate = new Date(reservation.fecha).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <article className="rounded-2xl border border-jet-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-body text-sm font-semibold text-jet-black">{reservation.articulo}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-lavender/15 px-2.5 py-1 font-mono text-[10px] font-bold text-deep-purple">
          <Box className="h-3 w-3" />
          Locker {reservation.locker}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-jet-black/50">
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-body text-xs">{formattedDate}</span>
      </div>

      <p className="mt-3 font-mono text-sm font-semibold text-jet-black">
        ${reservation.precio.toFixed(2)}
        <span className="font-body font-normal text-jet-black/45"> total</span>
      </p>
    </article>
  )
}
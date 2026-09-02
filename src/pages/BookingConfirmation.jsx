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
    <div className="min-h-screen bg-soft-white">
      {/* Navbar */}
      <nav className="bg-[#fafafa] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-10 w-auto"
            />
          </div>
          {/* Navigation */}
          <div
            className="hidden md:flex items-center gap-12 text-[#0d0d0d]"
            style={{ fontFamily: "Manrope" }}
          >
            
              <a href="#how-it-works"
              className="hover:text-[#433075] transition"
            >
              How it works
            </a>
            
              <a href="#categories"
              className="hover:text-[#433075] transition"
            >
              Categories
            </a>
            
              <a href="#security"
              className="hover:text-[#433075] transition"
            >
              Security
            </a>
          </div>
          {/* Buttons */}
          <div
            className="flex items-center gap-6"
            style={{ fontFamily: "Manrope" }}
          >
            <button className="text-[#0d0d0d] font-medium hover:text-[#433075] transition">
              Log in
            </button>
            <button className="bg-[#433075] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#37285f] transition">
              Get started
            </button>
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
        <p className="mt-1 text-sm text-jet-black/50">
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
      <footer className="border-t border-jet-black/5 px-6 py-8 text-center sm:px-10">
        <a href="#" className="text-sm font-medium text-jet-black/50 hover:text-deep-purple">
          Need help?
        </a>
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
        <p className="text-sm font-semibold text-jet-black">{reservation.articulo}</p>
        <span className="inline-flex items-center gap-1 rounded-full bg-lavender/15 px-2.5 py-1 font-mono text-[10px] font-bold text-deep-purple">
          <Box className="h-3 w-3" />
          Locker {reservation.locker}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-jet-black/50">
        <Calendar className="h-3.5 w-3.5" />
        <span className="text-xs">{formattedDate}</span>
      </div>

      <p className="mt-3 font-mono text-sm font-semibold text-jet-black">
        ${reservation.precio.toFixed(2)}
        <span className="font-body font-normal text-jet-black/45"> total</span>
      </p>
    </article>
  )
}
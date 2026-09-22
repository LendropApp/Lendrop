import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Lock, MapPin, ShieldCheck } from 'lucide-react'
import { createCheckout, describeFailureReason, payCheckout } from '../../services/payment/paymentService'
import { supabase } from '../../lib/supabaseClient'
import StatusMessage from '../StatusMessage'

const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Aprobada' },
  { number: '4000 0000 0000 0002', label: 'Rechazada' },
  { number: '4000 0000 0000 9995', label: 'Fondos insuficientes' },
  { number: '4000 0000 0000 0119', label: 'Error de pasarela' },
]

// Same BIN-range detection as AddCardForm.jsx — kept local instead of
// shared since the two forms validate slightly different field shapes
// (this one splits expMonth/expYear; AddCardForm uses a month picker).
function detectBrand(digits) {
  if (!digits) return null
  if (/^4/.test(digits)) return 'Visa'
  if (/^5[1-5]/.test(digits) || /^2(2[2-9]|[3-6]\d|7[01]|720)/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  return null
}

function expectedCvcLength(brand) {
  return brand === 'Amex' ? 4 : 3
}

function passesLuhn(digits) {
  let sum = 0
  let double = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  return sum % 10 === 0
}

function formatCardNumber(digits) {
  return digits.replace(/(.{4})(?=.)/g, '$1 ')
}

function formatExpiryInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// Owns the whole "pay for this reservation" step: creates the checkout,
// counts down to its expiry, collects and validates card details, charges
// it, and shows the locker assignment on success. ItemDetail only renders
// this after the renter picked dates and clicked "Continue to payment" —
// everything about money/cards lives here and in paymentService, never
// touching Supabase directly for anything payment-related.
export default function CheckoutPanel({ itemId, startDate, endDate, onBackToDates, onClose }) {
  const [phase, setPhase] = useState('creating') // creating | form | expired | success | fatal
  const [checkout, setCheckout] = useState(null)
  const [fatalError, setFatalError] = useState('')
  const [remaining, setRemaining] = useState(0)
  const [reservation, setReservation] = useState(null)

  const [showTestCards, setShowTestCards] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [holderName, setHolderName] = useState('')
  const [paying, setPaying] = useState(false)
  const [payStatus, setPayStatus] = useState({ type: '', text: '' })

  const numberRef = useRef(null)
  const expiryRef = useRef(null)
  const cvcRef = useRef(null)
  const nameRef = useRef(null)

  const digits = cardNumber.replace(/\D/g, '')
  const brand = detectBrand(digits)

  const startCheckout = useCallback(async () => {
    setPhase('creating')
    setFatalError('')
    try {
      const data = await createCheckout({ itemId, startDate, endDate })
      if (!data) throw { message: 'No se pudo iniciar el pago. Intenta de nuevo.' }
      setCheckout(data)
      setPhase('form')
    } catch (err) {
      setFatalError(err?.message || 'No se pudo iniciar el pago. Intenta de nuevo.')
      setPhase('fatal')
    }
  }, [itemId, startDate, endDate])

  useEffect(() => {
    startCheckout()
  }, [startCheckout])

  // Countdown to checkout.expires_at — ticks every second while the form
  // is open; flips to 'expired' the moment it hits zero.
  useEffect(() => {
    if (phase !== 'form' || !checkout?.expires_at) return
    function tick() {
      const secs = Math.max(0, Math.round((new Date(checkout.expires_at).getTime() - Date.now()) / 1000))
      setRemaining(secs)
      if (secs <= 0) setPhase('expired')
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [checkout, phase])

  // Card details never outlive a successful charge or a move to a fresh
  // checkout — nothing here ever reaches localStorage or a log line.
  function clearCardFields() {
    setCardNumber('')
    setExpiry('')
    setCvc('')
    setHolderName('')
  }

  function validateCard() {
    if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) {
      numberRef.current?.focus()
      return { error: 'El número de tarjeta no es válido.' }
    }

    const match = /^(\d{1,2})\/(\d{2,4})$/.exec(expiry.trim())
    if (!match) {
      expiryRef.current?.focus()
      return { error: 'Usa el formato MM/AA.' }
    }
    const month = Number(match[1])
    let year = Number(match[2])
    if (year < 100) year += 2000
    if (month < 1 || month > 12) {
      expiryRef.current?.focus()
      return { error: 'El mes de vencimiento no es válido.' }
    }
    const now = new Date()
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      expiryRef.current?.focus()
      return { error: 'La tarjeta está vencida.' }
    }

    const cvcLen = expectedCvcLength(brand)
    if (cvc.length !== cvcLen) {
      cvcRef.current?.focus()
      return { error: `El código de seguridad debe tener ${cvcLen} dígitos.` }
    }
    if (holderName.trim().length < 3) {
      nameRef.current?.focus()
      return { error: 'Escribe el nombre como aparece en la tarjeta.' }
    }

    return { card: { number: digits, expMonth: month, expYear: year, cvc, holderName: holderName.trim() } }
  }

  async function handlePay(e) {
    e.preventDefault()
    if (paying) return
    setPayStatus({ type: '', text: '' })

    const { card, error } = validateCard()
    if (error) {
      setPayStatus({ type: 'error', text: error })
      return
    }

    setPaying(true)
    try {
      const result = await payCheckout({ paymentId: checkout.payment_id, card })

      if (result.outcome === 'approved') {
        clearCardFields()
        const { data: res } = await supabase
          .from('reservations')
          .select('id, compartment:locker_compartments(compartment_code, locker:lockers(name, address, city))')
          .eq('id', result.reservationId)
          .maybeSingle()
        setPaying(false)
        setReservation(res)
        setPhase('success')
        return
      }

      // Declined/errored charge is normal data, not a thrown error — the
      // reservation behind it is already cancelled server-side, so a
      // retry needs a fresh checkout, not another charge on this one.
      clearCardFields()
      setPaying(false)
      setPayStatus({ type: 'error', text: describeFailureReason(result.failureReason) })
    } catch (err) {
      setPaying(false)
      if (err?.code === 'CHECKOUT_EXPIRED') {
        setPhase('expired')
        return
      }
      setPayStatus({ type: 'error', text: err?.message || 'No se pudo procesar el pago.' })
    }
  }

  async function handleTryAnotherCard() {
    clearCardFields()
    setPayStatus({ type: '', text: '' })
    await startCheckout()
  }

  if (phase === 'creating') {
    return (
      <div className="rounded-2xl border border-lavender/15 bg-white p-6 text-center">
        <p className="text-sm text-jet-black/50">Preparando tu pago…</p>
      </div>
    )
  }

  if (phase === 'fatal') {
    return (
      <div className="space-y-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-700">{fatalError}</p>
        <button
          type="button"
          onClick={onBackToDates}
          className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        >
          Volver a elegir fechas
        </button>
      </div>
    )
  }

  if (phase === 'expired') {
    return (
      <div className="space-y-3 rounded-2xl border border-jet-black/10 bg-jet-black/[0.02] p-4 text-center">
        <p className="text-sm font-semibold text-jet-black">El tiempo para pagar venció</p>
        <p className="text-xs text-jet-black/50">Las fechas fueron liberadas. Puedes intentarlo de nuevo.</p>
        <button
          type="button"
          onClick={onBackToDates}
          className="rounded-xl bg-deep-purple px-4 py-2 text-xs font-semibold text-white transition hover:bg-deep-purple/90"
        >
          Volver a elegir fechas
        </button>
      </div>
    )
  }

  if (phase === 'success') {
    const locker = reservation?.compartment?.locker
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">¡Reserva confirmada!</p>
          <p className="mt-1 text-xs text-emerald-700">
            Pago aprobado ({checkout.environment === 'mock' ? 'modo prueba' : checkout.environment}).
          </p>
        </div>

        {locker ? (
          <div className="flex items-start gap-2 rounded-xl bg-white p-3 text-left text-xs text-jet-black/70">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-deep-purple" />
            <span>
              {locker.name} · Compartimiento {reservation.compartment.compartment_code}
              <br />
              {locker.address}, {locker.city}
            </span>
          </div>
        ) : (
          <p className="text-xs text-emerald-700">Te asignaremos un locker en breve — revisa Track pickup.</p>
        )}

        <a
          href={`/rental-tracking?reservationId=${reservation?.id ?? ''}`}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-deep-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-purple/90"
        >
          Ver seguimiento de mi alquiler
        </a>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-emerald-700/70 hover:text-emerald-800"
        >
          Listo
        </button>
      </div>
    )
  }

  // phase === 'form'
  const cvcLen = expectedCvcLength(brand)
  const expired = remaining <= 0

  return (
    <div className="space-y-3 rounded-2xl border border-lavender/15 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-lavender/30 bg-lavender/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-deep-purple">
          Checkout Wompi · Modo prueba
        </span>
        <span
          className="font-mono text-xs font-semibold text-jet-black/60"
          role="timer"
          aria-label={`Tiempo restante para pagar: ${formatCountdown(remaining)}`}
        >
          {formatCountdown(remaining)}
        </span>
      </div>

      <div className="space-y-1.5 rounded-xl bg-jet-black/5 p-3 text-xs">
        <div className="flex items-center justify-between text-jet-black/70">
          <span>Subtotal del alquiler</span>
          <span className="font-mono">${Number(checkout.rental_subtotal).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-jet-black/70">
          <span>Tarifa de protección</span>
          <span className="font-mono">${Number(checkout.protection_fee_amount).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-jet-black/10 pt-1.5 font-semibold text-jet-black">
          <span>Total a pagar hoy</span>
          <span className="font-mono">${Number(checkout.amount).toFixed(2)} {checkout.currency}</span>
        </div>
        <div className="flex items-start gap-1.5 border-t border-jet-black/10 pt-1.5 text-jet-black/50">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            ${Number(checkout.damage_liability_amount).toFixed(2)} de depósito de garantía retenido — no se cobra
            ahora, se libera automáticamente si el artículo vuelve sin daños.
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowTestCards((v) => !v)}
        className="text-xs font-semibold text-deep-purple underline decoration-dotted hover:text-lavender"
      >
        {showTestCards ? 'Ocultar tarjetas de prueba' : 'Ver tarjetas de prueba'}
      </button>
      {showTestCards && (
        <ul className="space-y-1 rounded-xl bg-jet-black/[0.03] p-3 text-[11px] text-jet-black/60">
          {TEST_CARDS.map((c) => (
            <li key={c.number} className="flex items-center justify-between gap-3">
              <span className="font-mono">{c.number}</span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handlePay} className="space-y-3">
        <div>
          <label htmlFor="checkout-holder-name" className="text-xs font-semibold text-jet-black/60">
            Nombre en la tarjeta
          </label>
          <input
            id="checkout-holder-name"
            ref={nameRef}
            type="text"
            required
            autoComplete="cc-name"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 text-sm focus:border-lavender focus:outline-none"
            placeholder="Como aparece en la tarjeta"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="checkout-card-number" className="text-xs font-semibold text-jet-black/60">
              Número de tarjeta
            </label>
            {brand && <span className="text-xs font-semibold text-deep-purple">{brand}</span>}
          </div>
          <input
            id="checkout-card-number"
            ref={numberRef}
            type="text"
            required
            inputMode="numeric"
            autoComplete="cc-number"
            maxLength={23}
            value={formatCardNumber(digits)}
            onChange={(e) => setCardNumber(e.target.value)}
            className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
            placeholder="4242 4242 4242 4242"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="checkout-expiry" className="text-xs font-semibold text-jet-black/60">
              Vencimiento
            </label>
            <input
              id="checkout-expiry"
              ref={expiryRef}
              type="text"
              required
              inputMode="numeric"
              autoComplete="cc-exp"
              maxLength={5}
              value={expiry}
              onChange={(e) => setExpiry(formatExpiryInput(e.target.value))}
              className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
              placeholder="MM/AA"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="checkout-cvc" className="text-xs font-semibold text-jet-black/60">
              CVC
            </label>
            <input
              id="checkout-cvc"
              ref={cvcRef}
              type="text"
              required
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={cvcLen}
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, cvcLen))}
              className="mt-1 w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
              placeholder="123"
            />
          </div>
        </div>

        <div aria-live="polite" role="status">
          <StatusMessage type={payStatus.type} text={payStatus.text} />
        </div>

        {payStatus.type === 'error' && (
          <button
            type="button"
            onClick={handleTryAnotherCard}
            className="text-xs font-semibold text-deep-purple hover:text-lavender"
          >
            Intentar con otra tarjeta →
          </button>
        )}

        <button
          type="submit"
          disabled={paying || expired}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-deep-purple px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-deep-purple/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Lock className="h-3.5 w-3.5" />
          {paying ? 'Procesando…' : `Pagar $${Number(checkout.amount).toFixed(2)}`}
        </button>
        <p className="text-center text-[11px] text-jet-black/40">
          Pasarela en modo prueba — ninguna tarjeta real es cobrada.
        </p>
      </form>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, MapPin, ShieldCheck } from 'lucide-react'
import { createCheckout, describeFailureReason, payCheckout } from '../../services/payment/paymentService'
import { supabase } from '../../lib/supabaseClient'
import RentalStatus from '../RentalStatus'
import Shutter from '../Shutter'
import StatusMessage from '../StatusMessage'

const TEST_CARDS = [
  { number: '4242 4242 4242 4242', label: 'Approved' },
  { number: '4000 0000 0000 0002', label: 'Declined' },
  { number: '4000 0000 0000 9995', label: 'Insufficient funds' },
  { number: '4000 0000 0000 0119', label: 'Gateway error' },
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
      if (!data) throw { message: 'Could not start the payment. Please try again.' }
      setCheckout(data)
      setPhase('form')
    } catch (err) {
      setFatalError(err?.message || 'Could not start the payment. Please try again.')
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
      return { error: 'That card number isn’t valid.' }
    }

    const match = /^(\d{1,2})\/(\d{2,4})$/.exec(expiry.trim())
    if (!match) {
      expiryRef.current?.focus()
      return { error: 'Use the MM/YY format.' }
    }
    const month = Number(match[1])
    let year = Number(match[2])
    if (year < 100) year += 2000
    if (month < 1 || month > 12) {
      expiryRef.current?.focus()
      return { error: 'That expiry month isn’t valid.' }
    }
    const now = new Date()
    if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
      expiryRef.current?.focus()
      return { error: 'That card has expired.' }
    }

    const cvcLen = expectedCvcLength(brand)
    if (cvc.length !== cvcLen) {
      cvcRef.current?.focus()
      return { error: `The security code must be ${cvcLen} digits.` }
    }
    if (holderName.trim().length < 3) {
      nameRef.current?.focus()
      return { error: 'Enter the name exactly as it appears on the card.' }
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
      setPayStatus({ type: 'error', text: err?.message || 'Could not process the payment.' })
    }
  }

  async function handleTryAnotherCard() {
    clearCardFields()
    setPayStatus({ type: '', text: '' })
    await startCheckout()
  }

  if (phase === 'creating') {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="text-sm text-text-muted">Preparing your payment…</p>
      </div>
    )
  }

  if (phase === 'fatal') {
    return (
      <div className="space-y-3 rounded-2xl border border-danger/30 bg-danger-soft p-4 text-center">
        <p role="alert" className="text-sm text-danger">{fatalError}</p>
        <button
          type="button"
          onClick={onBackToDates}
          className="cta-outline rounded-xl px-4 py-1.5 text-sm font-semibold"
        >
          Back to dates
        </button>
      </div>
    )
  }

  if (phase === 'expired') {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-surface-raised p-4 text-center">
        <p className="font-bold text-text">Time to pay ran out</p>
        <p className="text-sm text-text-muted">The dates were released. You can try again.</p>
        <button
          type="button"
          onClick={onBackToDates}
          className="cta-brand rounded-xl px-4 py-2 text-sm font-semibold text-soft-white"
        >
          Back to dates
        </button>
      </div>
    )
  }

  if (phase === 'success') {
    const locker = reservation?.compartment?.locker
    const code = reservation?.compartment?.compartment_code
    return (
      <div className="space-y-3">
        {/* The signature moment: the shutter rolls up on the rental. */}
        <Shutter label="Booking confirmed" className="rounded-2xl border border-border">
          <div className="space-y-3 bg-surface p-5">
            <RentalStatus status="confirmed" />
            <p className="text-xl font-extrabold">You're booked.</p>
            <p className="text-xs text-text-muted">
              Payment approved ({checkout.environment === 'mock' ? 'test mode' : checkout.environment}).
            </p>

            {locker ? (
              <div className="flex items-end justify-between gap-4 rounded-xl bg-surface-raised p-4">
                <div className="min-w-0 text-sm">
                  <p className="flex items-center gap-1.5 font-semibold text-text">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {locker.name}
                  </p>
                  <p className="mt-1 text-text-muted">
                    {locker.address}, {locker.city}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="locker-code text-3xl font-medium text-text">{code}</p>
                  <p className="text-xs text-text-muted">compartment</p>
                </div>
              </div>
            ) : (
              <p className="rounded-xl bg-surface-raised p-4 text-sm text-text-muted">
                We'll assign a locker shortly. Check your rental tracking.
              </p>
            )}
          </div>
        </Shutter>

        <Link
          to={`/rental-tracking?reservationId=${reservation?.id ?? ''}`}
          className="cta-brand flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold text-soft-white"
        >
          Track this rental
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="cta-outline w-full rounded-xl px-4 py-2 text-sm font-semibold"
        >
          Done
        </button>
      </div>
    )
  }

  // phase === 'form'
  const cvcLen = expectedCvcLength(brand)
  const expired = remaining <= 0

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold text-text">
          Pay with Wompi <span className="font-normal text-text-muted">(test mode)</span>
        </span>
        <span
          className="locker-code text-sm font-medium text-text-muted"
          role="timer"
          aria-label={`Time left to pay: ${formatCountdown(remaining)}`}
        >
          {formatCountdown(remaining)}
        </span>
      </div>

      <div className="space-y-1.5 rounded-xl bg-surface-raised p-3 text-xs tabular-nums">
        <div className="flex items-center justify-between text-text-muted">
          <span>Rental subtotal</span>
          <span>${Number(checkout.rental_subtotal).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-text-muted">
          <span>Protection fee</span>
          <span>${Number(checkout.protection_fee_amount).toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-2 font-semibold text-text">
          <span className="text-sm">Total charged today</span>
          <span>
            <span className="num text-xl">${Number(checkout.amount).toFixed(2)}</span>{' '}
            <span className="text-text-muted">{checkout.currency}</span>
          </span>
        </div>
        <div className="flex items-start gap-1.5 border-t border-border pt-1.5 text-text-muted">
          <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            ${Number(checkout.damage_liability_amount).toFixed(2)} damage-liability deposit held — not charged now,
            released automatically if the item comes back with no damage.
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowTestCards((v) => !v)}
        className="text-xs font-semibold text-primary underline decoration-dotted hover:underline"
      >
        {showTestCards ? 'Hide test cards' : 'View test cards'}
      </button>
      {showTestCards && (
        <ul className="space-y-1 rounded-xl bg-surface-raised p-3 text-xs text-text-muted">
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
          <label htmlFor="checkout-holder-name" className="text-xs font-semibold text-text-muted">
            Name on card
          </label>
          <input
            id="checkout-holder-name"
            ref={nameRef}
            type="text"
            required
            autoComplete="cc-name"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="As it appears on the card"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="checkout-card-number" className="text-xs font-semibold text-text-muted">
              Card number
            </label>
            {brand && <span className="text-xs font-semibold text-primary">{brand}</span>}
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
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
            placeholder="4242 4242 4242 4242"
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="checkout-expiry" className="text-xs font-semibold text-text-muted">
              Expiry
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
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
              placeholder="MM/YY"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="checkout-cvc" className="text-xs font-semibold text-text-muted">
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
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
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
            className="text-xs font-semibold text-primary hover:underline"
          >
            Try another card
          </button>
        )}

        <button
          type="submit"
          disabled={paying || expired}
          className="cta-brand flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-soft-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Lock className="h-4 w-4" aria-hidden="true" />
          {paying ? 'Processing…' : `Pay $${Number(checkout.amount).toFixed(2)}`}
        </button>
        <p className="text-center text-xs text-text-muted">
          Test-mode gateway — no real card is ever charged.
        </p>
      </form>
    </div>
  )
}

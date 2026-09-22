// The only place in the app that talks to Supabase for payments/checkout
// (create_checkout, apply_payment_result via the payments-checkout Edge
// Function). No screen should call these directly — this mirrors the
// PaymentProvider boundary from PLAN_MVP_70.md: the real gateway swap
// already lives server-side (supabase/functions/payments-checkout/
// gateway.ts, PaymentGateway/MockWompiGateway), this module is what
// keeps that swap invisible to every screen.
import { supabase } from '../../lib/supabaseClient'

// create_checkout raises the error code itself as the Postgres exception
// message (no JSON body) — e.g. error.message === 'IDENTITY_NOT_VERIFIED'.
const RPC_ERROR_MESSAGES = {
  NOT_AUTHENTICATED: 'You need to sign in to continue.',
  IDENTITY_NOT_VERIFIED: 'Verify your identity before booking a rental.',
  INVALID_DATE_RANGE: 'Choose a valid date range.',
  START_DATE_IN_PAST: 'That start date has already passed. Pick another.',
  ITEM_NOT_AVAILABLE: 'This item is no longer available.',
  CANNOT_RENT_OWN_ITEM: 'You can’t rent your own item.',
  DATES_UNAVAILABLE: 'Those dates were just booked. Please pick different ones.',
  ITEM_TOO_LARGE_FOR_LOCKERS: 'This item doesn’t fit in our lockers.',
  NO_LOCKER_CAPACITY: 'No lockers of the size this item needs are free for those dates. Try different dates.',
}

// payments-checkout returns { error: 'CODE', message?: '...' } as its
// JSON body on any non-2xx response.
const FUNCTION_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Your session expired. Please sign in again.',
  MISSING_FIELDS: 'Some payment details are missing.',
  INVALID_JSON: 'Could not read the payment request.',
  PAYMENT_NOT_FOUND: 'We couldn’t find that payment.',
  PAYMENT_ALREADY_PROCESSED: 'This payment was already processed.',
  CHECKOUT_EXPIRED: 'The time to pay ran out. Please pick your dates again.',
  ENVIRONMENT_MISMATCH: 'Gateway configuration error. Please try again later.',
  INVALID_CARD_NUMBER: 'That card number isn’t valid.',
  INVALID_EXPIRY: 'That expiry date isn’t valid.',
  CARD_EXPIRED: 'That card has expired.',
  INVALID_CVC: 'That security code isn’t valid.',
  INVALID_HOLDER: 'Enter the name exactly as it appears on the card.',
  GATEWAY_UNAVAILABLE: 'The payment gateway didn’t respond. Please try again.',
  PAYMENT_APPLY_FAILED: 'Could not apply the payment result. Please contact support.',
  METHOD_NOT_ALLOWED: 'Invalid request.',
}

// A charge can come back as a normal (2xx) response with outcome
// 'declined' or 'error' — that's not a thrown error, it's data the
// checkout screen renders. These map payments.failure_reason /
// apply_payment_result's p_failure_reason to copy for that case.
const FAILURE_REASON_MESSAGES = {
  card_declined: 'Your bank declined the card.',
  insufficient_funds: 'Insufficient funds on that card.',
  processing_error: 'The payment gateway had a processing error.',
  checkout_expired: 'The time to pay ran out.',
  late_approval_auto_refund: 'The payment arrived after the checkout expired and was refunded automatically.',
}

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

function normalizeRpcError(error) {
  const code = error?.message?.trim() || 'UNKNOWN'
  return { code, message: RPC_ERROR_MESSAGES[code] ?? DEFAULT_MESSAGE }
}

// functions.invoke() puts the real response on error.context (a Response
// object) instead of a parsed body — read it as JSON to get what the
// function actually returned.
async function normalizeFunctionError(error) {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()
      const code = body?.error ?? 'UNKNOWN'
      return { code, message: body?.message || FUNCTION_ERROR_MESSAGES[code] || DEFAULT_MESSAGE }
    } catch {
      return { code: 'UNKNOWN', message: DEFAULT_MESSAGE }
    }
  }
  return { code: 'UNKNOWN', message: error?.message || DEFAULT_MESSAGE }
}

// Friendly copy for a declined/errored charge's failure_reason. Used by
// the checkout screen after a normal (non-thrown) payCheckout() result.
export function describeFailureReason(reason) {
  return FAILURE_REASON_MESSAGES[reason] ?? DEFAULT_MESSAGE
}

// Creates (or reuses, if the caller retries within a still-valid
// checkout) a pending reservation + pending payment with a 15-minute
// window to pay. Price/fees/damage-liability are always computed
// server-side — never trust or recompute them on the client.
export async function createCheckout({ itemId, startDate, endDate }) {
  const { data, error } = await supabase.rpc('create_checkout', {
    p_item_id: itemId,
    p_start_date: startDate,
    p_end_date: endDate,
  })

  if (error) {
    throw normalizeRpcError(error)
  }

  return data?.[0] ?? null
}

// Advisory-only pre-check before the renter fills in card details: does
// any compartment of the required size exist and sit free for these
// dates? create_checkout is still the authoritative check (it raises
// NO_LOCKER_CAPACITY itself) -- this just avoids sending someone through
// a whole card form only to hit that wall. Fails open (assumes capacity)
// on any error so a flaky check never blocks booking on its own.
export async function checkLockerCapacity({ itemId, startDate, endDate }) {
  const { data, error } = await supabase.rpc('has_locker_capacity_for_item', {
    p_item_id: itemId,
    p_start: startDate,
    p_end: endDate,
  })
  if (error) return true
  return data !== false
}

// Charges a pending checkout's card. Resolves with the Edge Function's
// response even on a declined/errored charge (that's normal data, not a
// thrown error — check `ok`/`outcome`/`failureReason`); throws only for
// genuine request failures (expired checkout, invalid card fields,
// already-processed payment, gateway unavailable, etc).
export async function payCheckout({ paymentId, card }) {
  const { data, error } = await supabase.functions.invoke('payments-checkout', {
    body: { paymentId, card },
  })

  if (error) {
    throw await normalizeFunctionError(error)
  }

  return data
}

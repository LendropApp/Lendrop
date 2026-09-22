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
  NOT_AUTHENTICATED: 'Debes iniciar sesión para continuar.',
  IDENTITY_NOT_VERIFIED: 'Verifica tu identidad antes de reservar.',
  INVALID_DATE_RANGE: 'Elige un rango de fechas válido.',
  START_DATE_IN_PAST: 'La fecha de inicio ya pasó. Elige otra.',
  ITEM_NOT_AVAILABLE: 'Este artículo ya no está disponible.',
  CANNOT_RENT_OWN_ITEM: 'No puedes reservar tu propio artículo.',
  DATES_UNAVAILABLE: 'Esas fechas se acaban de reservar. Elige otras.',
}

// payments-checkout returns { error: 'CODE', message?: '...' } as its
// JSON body on any non-2xx response.
const FUNCTION_ERROR_MESSAGES = {
  UNAUTHORIZED: 'Tu sesión expiró. Inicia sesión de nuevo.',
  MISSING_FIELDS: 'Faltan datos para procesar el pago.',
  INVALID_JSON: 'No se pudo leer la solicitud de pago.',
  PAYMENT_NOT_FOUND: 'No encontramos ese pago.',
  PAYMENT_ALREADY_PROCESSED: 'Este pago ya fue procesado.',
  CHECKOUT_EXPIRED: 'El tiempo para pagar venció. Vuelve a elegir tus fechas.',
  ENVIRONMENT_MISMATCH: 'Error de configuración de la pasarela. Intenta más tarde.',
  INVALID_CARD_NUMBER: 'El número de tarjeta no es válido.',
  INVALID_EXPIRY: 'La fecha de vencimiento no es válida.',
  CARD_EXPIRED: 'La tarjeta está vencida.',
  INVALID_CVC: 'El código de seguridad no es válido.',
  INVALID_HOLDER: 'Escribe el nombre como aparece en la tarjeta.',
  GATEWAY_UNAVAILABLE: 'La pasarela no respondió. Intenta de nuevo.',
  PAYMENT_APPLY_FAILED: 'No se pudo aplicar el resultado del pago. Contacta a soporte.',
  METHOD_NOT_ALLOWED: 'Solicitud inválida.',
}

// A charge can come back as a normal (2xx) response with outcome
// 'declined' or 'error' — that's not a thrown error, it's data the
// checkout screen renders. These map payments.failure_reason /
// apply_payment_result's p_failure_reason to copy for that case.
const FAILURE_REASON_MESSAGES = {
  card_declined: 'Tu banco rechazó la tarjeta.',
  insufficient_funds: 'Fondos insuficientes en la tarjeta.',
  processing_error: 'Hubo un error al procesar el pago con la pasarela.',
  checkout_expired: 'El tiempo para pagar venció.',
  late_approval_auto_refund: 'El pago llegó después de vencer el checkout y fue reembolsado automáticamente.',
}

const DEFAULT_MESSAGE = 'Algo salió mal. Intenta de nuevo.'

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

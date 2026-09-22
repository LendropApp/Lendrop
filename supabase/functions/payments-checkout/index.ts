// payments-checkout
// Procesa el pago de un checkout creado con create_checkout().
// Flujo: validar usuario -> validar pago pendiente y vigente -> cobrar con la
// pasarela (hoy mock) -> aplicar resultado vía apply_payment_result (el mismo
// punto de entrada que usará el webhook real de Wompi).
// Los datos de tarjeta NUNCA se loguean ni se guardan: solo marca y last4.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CardValidationError, resolveGateway } from './gateway.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'UNAUTHORIZED' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'UNAUTHORIZED' }, 401)
  const caller = userData.user

  let body: { paymentId?: string; card?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }
  const { paymentId, card } = body
  if (!paymentId || typeof paymentId !== 'string' || !card) {
    return json({ error: 'MISSING_FIELDS' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: payment, error: payErr } = await admin
    .from('payments')
    .select('id, amount, currency, status, environment, checkout_expires_at, reservation:reservations(id, renter_id, status)')
    .eq('id', paymentId)
    .maybeSingle()

  if (payErr || !payment) return json({ error: 'PAYMENT_NOT_FOUND' }, 404)
  // deno-lint-ignore no-explicit-any
  const reservation = payment.reservation as any
  if (!reservation || reservation.renter_id !== caller.id) return json({ error: 'PAYMENT_NOT_FOUND' }, 404)

  if (payment.status !== 'pending') {
    return json({ error: 'PAYMENT_ALREADY_PROCESSED', paymentStatus: payment.status, reservationStatus: reservation.status }, 409)
  }

  if (payment.checkout_expires_at && new Date(payment.checkout_expires_at) < new Date()) {
    await admin.rpc('apply_payment_result', {
      p_payment_id: payment.id,
      p_outcome: 'expired',
      p_transaction_id: `expire:${payment.id}`,
      p_failure_reason: 'checkout_expired',
    })
    return json({ error: 'CHECKOUT_EXPIRED', message: 'El tiempo para pagar venció. Vuelve a reservar las fechas.' }, 410)
  }

  const gateway = resolveGateway()
  if (gateway.environment !== payment.environment) {
    return json({ error: 'ENVIRONMENT_MISMATCH' }, 409)
  }

  let result
  try {
    result = await gateway.charge({
      paymentId: payment.id,
      amount: Number(payment.amount),
      currency: payment.currency,
      // deno-lint-ignore no-explicit-any
      card: card as any,
    })
  } catch (e) {
    if (e instanceof CardValidationError) return json({ error: e.code, message: e.message }, 422)
    console.error('gateway_failure', { paymentId: payment.id, error: String(e) })
    return json({ error: 'GATEWAY_UNAVAILABLE', message: 'La pasarela no respondió. Intenta de nuevo.' }, 502)
  }

  const { data: applied, error: applyErr } = await admin.rpc('apply_payment_result', {
    p_payment_id: payment.id,
    p_outcome: result.outcome,
    p_transaction_id: result.transactionId,
    p_card_brand: result.cardBrand,
    p_card_last4: result.cardLast4,
    p_failure_reason: result.failureReason,
    p_payload: result.raw,
  })
  if (applyErr) {
    console.error('apply_payment_result_failed', { paymentId: payment.id, error: applyErr.message })
    return json({ error: 'PAYMENT_APPLY_FAILED' }, 500)
  }

  const row = Array.isArray(applied) ? applied[0] : applied
  return json({
    ok: result.outcome === 'approved',
    outcome: result.outcome,
    paymentStatus: row?.payment_status,
    reservationStatus: row?.reservation_status,
    reservationId: reservation.id,
    transactionId: result.transactionId,
    cardBrand: result.cardBrand,
    cardLast4: result.cardLast4,
    failureReason: result.failureReason,
    environment: gateway.environment,
  })
})

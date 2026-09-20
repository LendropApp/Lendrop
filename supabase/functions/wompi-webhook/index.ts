import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deploy with --no-verify-jwt: Wompi calls this with its own HMAC
// signature (the `wompi_hash` header), not a Supabase auth token.
// See docs.wompi.sv/webhook/validar-webhook.

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmacSha256Hex(secret: string, message: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  return bufferToHex(signature)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // The signature covers the exact raw bytes Wompi sent, so this must
  // read the body as text before any JSON.parse — parsing and later
  // re-serializing can reorder/reformat it and break the hash match.
  const rawBody = await request.text()
  const receivedHash = request.headers.get('wompi_hash') ?? request.headers.get('Wompi-Hash')
  const clientSecret = Deno.env.get('WOMPI_CLIENT_SECRET')

  if (!clientSecret) {
    console.error('wompi-webhook: WOMPI_CLIENT_SECRET is not configured')
    return new Response('Server misconfigured', { status: 500 })
  }

  const expectedHash = await hmacSha256Hex(clientSecret, rawBody)
  if (!receivedHash || receivedHash.toLowerCase() !== expectedHash.toLowerCase()) {
    console.error('wompi-webhook: signature mismatch')
    return new Response('Invalid signature', { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (payload.ResultadoTransaccion !== 'ExitosaAprobada') return new Response('Ignored', { status: 200 })

  const reservationId = payload.EnlacePago?.IdentificadorEnlaceComercio
  const amount = Number(payload.Monto)
  const transactionId = payload.IdTransaccion
  if (!reservationId || !transactionId || !Number.isFinite(amount)) return new Response('Invalid payload', { status: 400 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: payment } = await admin.from('payments')
    .select('id, reservation_id, amount, status')
    .eq('reservation_id', reservationId)
    .eq('provider', 'wompi')
    .maybeSingle()

  if (!payment) return new Response('Payment not found', { status: 404 })
  if (Number(payment.amount) !== amount) return new Response('Amount mismatch', { status: 400 })
  if (payment.status === 'paid') return new Response('Already processed', { status: 200 })

  const { error: paymentError } = await admin.from('payments').update({
    status: 'paid',
    provider_reference: transactionId,
    paid_at: payload.FechaTransaccion ?? new Date().toISOString(),
  }).eq('id', payment.id).eq('status', 'pending')
  if (paymentError) return new Response('Could not update payment', { status: 500 })

  const { error: reservationError } = await admin.from('reservations')
    .update({ status: 'confirmed' })
    .eq('id', reservationId)
    .eq('status', 'pending')
  if (reservationError) return new Response('Could not confirm reservation', { status: 500 })

  return new Response('OK', { status: 200 })
})
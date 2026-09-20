import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const payload = await request.json()
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
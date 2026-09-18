import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const clientId = Deno.env.get('WOMPI_CLIENT_ID')
  const clientSecret = Deno.env.get('WOMPI_CLIENT_SECRET')
  const appUrl = Deno.env.get('APP_URL')
  const functionsUrl = Deno.env.get('SUPABASE_FUNCTIONS_URL') ?? `${supabaseUrl}/functions/v1`

  if (!clientId || !clientSecret || !appUrl) return json({ error: 'Wompi is not configured' }, 500)

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Missing authorization' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401)

  const { itemId, startDate, endDate } = await request.json()
  const { data: reservation, error: reservationError } = await userClient.rpc('create_pending_reservation', {
    p_item_id: itemId,
    p_start_date: startDate,
    p_end_date: endDate,
  }).single()

  if (reservationError || !reservation) {
    const conflict = reservationError?.code === '23P01' || reservationError?.message?.includes('reservations')
    return json({ error: conflict ? 'Those dates are no longer available.' : 'Could not create the reservation.' }, 409)
  }

  const admin = adminClient(supabaseUrl, serviceKey)
  const { error: paymentError } = await admin.from('payments').insert({
    reservation_id: reservation.reservation_id,
    amount: reservation.amount,
    currency: 'USD',
    status: 'pending',
    provider: 'wompi',
  })
  if (paymentError) {
    await cancelReservation(admin, reservation.reservation_id)
    return json({ error: 'Could not initialize the payment.' }, 500)
  }

  const tokenResponse = await fetch('https://id.wompi.sv/connect/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: 'wompi_api',
    }),
  })
  const token = await tokenResponse.json()
  if (!tokenResponse.ok || !token.access_token) {
    await cancelReservation(admin, reservation.reservation_id)
    await admin.from('payments').delete().eq('reservation_id', reservation.reservation_id).eq('status', 'pending')
    return json({ error: 'Could not authenticate with Wompi.' }, 502)
  }

  const webhookUrl = `${functionsUrl}/wompi-webhook`
  const linkResponse = await fetch('https://api.wompi.sv/EnlacePago', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token.access_token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      identificadorEnlaceComercio: reservation.reservation_id,
      monto: Number(reservation.amount),
      nombreProducto: 'Reserva Lendrop',
      infoProducto: { descripcionProducto: `Reserva ${reservation.reservation_id}` },
      configuracion: {
        urlRedirect: `${appUrl}/payment-return?reservation_id=${reservation.reservation_id}`,
        urlRetorno: `${appUrl}/item/${itemId}`,
        esMontoEditable: false,
        esCantidadEditable: false,
        cantidadPorDefecto: 1,
        urlWebhook: webhookUrl,
        notificarTransaccionCliente: true,
      },
    }),
  })
  const link = await linkResponse.json()
  if (!linkResponse.ok || !link.urlEnlace) {
    await cancelReservation(admin, reservation.reservation_id)
    await admin.from('payments').delete().eq('reservation_id', reservation.reservation_id).eq('status', 'pending')
    return json({ error: 'Could not create the Wompi payment link.' }, 502)
  }

  return json({ reservationId: reservation.reservation_id, paymentUrl: link.urlEnlace })
})

function adminClient(supabaseUrl: string, serviceKey: string) {
  return createClient(supabaseUrl, serviceKey)
}

async function cancelReservation(admin: ReturnType<typeof adminClient>, reservationId: string) {
  await admin.from('reservations').update({ status: 'cancelled' }).eq('id', reservationId).eq('status', 'pending')
}
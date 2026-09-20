// Verifies a renter/lender's identity (DUI + account password) before
// logging a locker drop-off or pickup. This is the "secure backend"
// locker_events' table comment requires — the client never inserts
// locker_events rows directly.
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

  const authorization = request.headers.get('Authorization')
  if (!authorization) return json({ error: 'Missing authorization' }, 401)

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: userData, error: userError } = await userClient.auth.getUser()
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401)
  const caller = userData.user

  const { reservationId, dui, password, action } = await request.json()
  if (!reservationId || !dui || !password || (action !== 'deposit' && action !== 'pickup')) {
    return json({ error: 'Missing or invalid fields' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: reservation, error: reservationError } = await admin
    .from('reservations')
    .select('id, status, compartment_id, renter_id, item:items(owner_id)')
    .eq('id', reservationId)
    .maybeSingle()

  if (reservationError || !reservation) return json({ error: 'Reservation not found' }, 404)
  if (reservation.status !== 'confirmed' || !reservation.compartment_id) {
    return json({ error: 'This reservation has no locker assigned yet.' }, 409)
  }

  const isRenter = reservation.renter_id === caller.id
  const isOwner = reservation.item?.owner_id === caller.id

  if (action === 'deposit' && !isOwner) return json({ error: 'Only the lender can drop off the item.' }, 403)
  if (action === 'pickup' && !isRenter) return json({ error: 'Only the renter can pick up the item.' }, 403)

  const { data: existingEvents } = await admin
    .from('locker_events')
    .select('event_type')
    .eq('reservation_id', reservationId)

  const hasDeposited = (existingEvents ?? []).some((e) => e.event_type === 'item_deposited')
  const hasRetrieved = (existingEvents ?? []).some((e) => e.event_type === 'item_retrieved')

  if (action === 'deposit' && hasDeposited) return json({ error: 'The item was already marked as dropped off.' }, 409)
  if (action === 'pickup' && !hasDeposited) return json({ error: 'The lender has not dropped off the item yet.' }, 409)
  if (action === 'pickup' && hasRetrieved) return json({ error: 'The item was already picked up.' }, 409)

  const { data: privateProfile, error: privateError } = await admin
    .from('profile_private')
    .select('dui')
    .eq('user_id', caller.id)
    .maybeSingle()

  if (privateError || !privateProfile?.dui) return json({ error: 'Could not verify your identity.' }, 500)
  const normalizeDui = (value: string) => value.replace(/[^a-z0-9]/gi, '').toUpperCase()
  if (normalizeDui(privateProfile.dui) !== normalizeDui(String(dui))) {
    return json({ error: 'That DUI does not match your account.' }, 401)
  }

  // Real password check: attempt a fresh sign-in with the caller's own
  // email. A wrong password fails here without ever needing the admin
  // API or storing/comparing the hash ourselves.
  const passwordClient = createClient(supabaseUrl, anonKey)
  const { error: passwordError } = await passwordClient.auth.signInWithPassword({
    email: caller.email!,
    password,
  })
  if (passwordError) return json({ error: 'Incorrect password.' }, 401)

  const eventType = action === 'deposit' ? 'item_deposited' : 'item_retrieved'
  const { error: insertError } = await admin.from('locker_events').insert({
    compartment_id: reservation.compartment_id,
    reservation_id: reservationId,
    actor_id: caller.id,
    event_type: eventType,
  })
  if (insertError) return json({ error: 'Could not log the locker event.' }, 500)

  const newCompartmentStatus = action === 'deposit' ? 'occupied' : 'available'
  await admin.from('locker_compartments').update({ status: newCompartmentStatus }).eq('id', reservation.compartment_id)

  return json({ ok: true, eventType, occurredAt: new Date().toISOString() })
})

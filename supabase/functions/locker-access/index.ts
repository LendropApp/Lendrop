// Verifies a renter/lender's identity (DUI + Lendrop ID) before
// logging a locker drop-off, pickup, or return event. The Lendrop ID is
// the private 6-character code from 0030_lendrop_id.sql; wrong attempts
// are limited to MAX_FAILED_ATTEMPTS per FAILED_WINDOW_MINUTES so it
// cannot be guessed by trying. This is the
// "secure backend" locker_events' table comment requires — the client
// never inserts locker_events rows directly.
//
// Full lifecycle: deposit (owner) -> pickup (renter) -> return_dropoff
// (renter) -> return_pickup (owner), which finalizes the reservation
// as 'completed' and auto-releases the damage-liability hold if it
// hasn't already been captured (see Fase 8's review RLS, which
// requires status = 'completed'). Fase 10: return_pickup can instead
// be flagged with damage (hasDamage + damageReason + a required
// 'return_pick_up' evidence photo) -- the reservation goes to
// 'disputed' and the damage hold is left 'held' (pending a real review
// flow -- see 0013_damage_deposit_model.sql's scope note on
// capture_damage_hold) instead of auto-releasing.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ACTIONS = ['deposit', 'pickup', 'return_dropoff', 'return_pickup'] as const
type Action = (typeof ACTIONS)[number]

const EVENT_TYPE: Record<Action, string> = {
  deposit: 'item_deposited',
  pickup: 'item_retrieved',
  return_dropoff: 'return_deposited',
  return_pickup: 'return_retrieved',
}

const EVIDENCE_STAGE: Partial<Record<Action, string>> = {
  deposit: 'drop_off',
  return_dropoff: 'return_drop_off',
}

const MAX_FAILED_ATTEMPTS = 5
const FAILED_WINDOW_MINUTES = 15

// Accepts "abc-123", "ABC 123" or "abc123"; compares the bare 6 characters.
const normalizeCode = (value: string) => value.replace(/[^a-z0-9]/gi, '').toUpperCase()

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

  const { reservationId, dui, lendropId, action, hasDamage, damageReason } = await request.json()
  if (!reservationId || !dui || !lendropId || !ACTIONS.includes(action)) {
    return json({ error: 'Missing or invalid fields' }, 400)
  }
  if (action === 'return_pickup' && hasDamage && !String(damageReason ?? '').trim()) {
    return json({ error: 'Describe the damage before reporting it.' }, 400)
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

  if ((action === 'deposit' || action === 'return_pickup') && !isOwner) {
    return json({ error: 'Only the lender can do this.' }, 403)
  }
  if ((action === 'pickup' || action === 'return_dropoff') && !isRenter) {
    return json({ error: 'Only the renter can do this.' }, 403)
  }

  const requiredStage = EVIDENCE_STAGE[action as Action] ?? (action === 'return_pickup' && hasDamage ? 'return_pick_up' : null)
  if (requiredStage) {
    const { data: evidence } = await admin
      .from('photo_evidence')
      .select('id')
      .eq('reservation_id', reservationId)
      .eq('stage', requiredStage)
      .limit(1)
    if (!evidence || evidence.length === 0) {
      return json(
        {
          error:
            action === 'return_pickup' && hasDamage
              ? 'Upload a photo of the damage before reporting it.'
              : 'Upload a condition photo before confirming this step.',
        },
        409
      )
    }
  }

  const { data: existingEvents } = await admin
    .from('locker_events')
    .select('event_type')
    .eq('reservation_id', reservationId)

  const eventTypes = new Set((existingEvents ?? []).map((e) => e.event_type))
  const hasDeposited = eventTypes.has('item_deposited')
  const hasRetrieved = eventTypes.has('item_retrieved')
  const hasReturnDeposited = eventTypes.has('return_deposited')
  const hasReturnRetrieved = eventTypes.has('return_retrieved')

  if (action === 'deposit' && hasDeposited) return json({ error: 'The item was already marked as dropped off.' }, 409)
  if (action === 'pickup' && !hasDeposited) return json({ error: 'The lender has not dropped off the item yet.' }, 409)
  if (action === 'pickup' && hasRetrieved) return json({ error: 'The item was already picked up.' }, 409)
  if (action === 'return_dropoff' && !hasRetrieved) return json({ error: 'You have not picked up this item yet.' }, 409)
  if (action === 'return_dropoff' && hasReturnDeposited) return json({ error: 'The return was already dropped off.' }, 409)
  if (action === 'return_pickup' && !hasReturnDeposited) return json({ error: 'The renter has not returned the item yet.' }, 409)
  if (action === 'return_pickup' && hasReturnRetrieved) return json({ error: 'The return was already picked up.' }, 409)

  // Rate limit before checking anything secret.
  const windowStart = new Date(Date.now() - FAILED_WINDOW_MINUTES * 60_000).toISOString()
  const { count: recentFailures } = await admin
    .from('lendrop_id_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', caller.id)
    .eq('kind', 'locker')
    .eq('succeeded', false)
    .gte('created_at', windowStart)
  if ((recentFailures ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return json(
      { error: `Too many wrong attempts. Try again in ${FAILED_WINDOW_MINUTES} minutes.` },
      429
    )
  }

  const { data: privateProfile, error: privateError } = await admin
    .from('profile_private')
    .select('dui, lendrop_id')
    .eq('user_id', caller.id)
    .maybeSingle()

  if (privateError || !privateProfile?.dui || !privateProfile?.lendrop_id) {
    return json({ error: 'Could not verify your identity.' }, 500)
  }

  // One generic message for either field, so a wrong answer doesn't
  // reveal which of the two was right.
  const matches =
    normalizeCode(privateProfile.dui) === normalizeCode(String(dui)) &&
    normalizeCode(privateProfile.lendrop_id) === normalizeCode(String(lendropId))

  await admin.from('lendrop_id_attempts').insert({ user_id: caller.id, kind: 'locker', succeeded: matches })

  if (!matches) {
    const left = MAX_FAILED_ATTEMPTS - (recentFailures ?? 0) - 1
    return json(
      {
        error:
          left > 0
            ? `That DUI and Lendrop ID don't match your account. ${left} ${left === 1 ? 'try' : 'tries'} left.`
            : `That DUI and Lendrop ID don't match your account. Try again in ${FAILED_WINDOW_MINUTES} minutes.`,
      },
      401
    )
  }

  const eventType = EVENT_TYPE[action as Action]
  const { error: insertError } = await admin.from('locker_events').insert({
    compartment_id: reservation.compartment_id,
    reservation_id: reservationId,
    actor_id: caller.id,
    event_type: eventType,
  })
  if (insertError) return json({ error: 'Could not log the locker event.' }, 500)

  const newCompartmentStatus = action === 'deposit' || action === 'return_dropoff' ? 'occupied' : 'available'
  await admin.from('locker_compartments').update({ status: newCompartmentStatus }).eq('id', reservation.compartment_id)

  if (action === 'return_pickup' && hasDamage) {
    // Fase 10: damage reported on return — hold the reservation as
    // 'disputed' and leave the damage hold 'held' rather than releasing
    // it. Deliberately does NOT call capture_damage_hold: that's a
    // lender self-report with no review step (see 0013's scope note),
    // so real review has to resolve the dispute before any capture.
    await admin.from('reservations').update({ status: 'disputed' }).eq('id', reservationId).eq('status', 'confirmed')
    await admin.from('disputes').insert({
      reservation_id: reservationId,
      raised_by: caller.id,
      reason: damageReason,
    })
  } else if (action === 'return_pickup') {
    await admin.from('reservations').update({ status: 'completed' }).eq('id', reservationId).eq('status', 'confirmed')
    // Auto-release the damage hold on a clean return — a no-op if it
    // was already captured/partially_captured via capture_damage_hold.
    await admin
      .from('damage_holds')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('reservation_id', reservationId)
      .eq('status', 'held')
  }

  return json({
    ok: true,
    eventType,
    occurredAt: new Date().toISOString(),
    disputed: action === 'return_pickup' && Boolean(hasDamage),
  })
})

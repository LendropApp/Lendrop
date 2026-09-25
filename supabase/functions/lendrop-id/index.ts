// lendrop-id
// Issues a new Lendrop ID for the signed-in user, after confirming their
// account password. The old ID stops working immediately. Reading the
// current ID doesn't need this function: profile_private is readable by
// its owner through RLS (see 0030_lendrop_id.sql).
//
// Emite un nuevo ID de Lendrop tras confirmar la contraseña de la cuenta.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MAX_FAILED_ATTEMPTS = 5
const FAILED_WINDOW_MINUTES = 15

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

  const { password } = await request.json().catch(() => ({}))
  if (!password) return json({ error: 'Enter your account password.' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)

  const windowStart = new Date(Date.now() - FAILED_WINDOW_MINUTES * 60_000).toISOString()
  const { count: recentFailures } = await admin
    .from('lendrop_id_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', caller.id)
    .eq('kind', 'regenerate')
    .eq('succeeded', false)
    .gte('created_at', windowStart)
  if ((recentFailures ?? 0) >= MAX_FAILED_ATTEMPTS) {
    return json({ error: `Too many wrong attempts. Try again in ${FAILED_WINDOW_MINUTES} minutes.` }, 429)
  }

  // Password check: a fresh sign-in with the caller's own email, the same
  // approach locker-access used before the Lendrop ID existed.
  const passwordClient = createClient(supabaseUrl, anonKey)
  const { error: passwordError } = await passwordClient.auth.signInWithPassword({
    email: caller.email!,
    password,
  })

  await admin
    .from('lendrop_id_attempts')
    .insert({ user_id: caller.id, kind: 'regenerate', succeeded: !passwordError })

  if (passwordError) return json({ error: 'Incorrect password.' }, 401)

  const { data: lendropId, error: regenError } = await admin.rpc('regenerate_lendrop_id', { p_user: caller.id })
  if (regenError || !lendropId) return json({ error: 'Could not create a new Lendrop ID. Please try again.' }, 500)

  return json({ lendropId })
})

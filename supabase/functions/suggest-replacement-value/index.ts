// suggest-replacement-value
// Suggests a replacement-value range (USD) at publish time: what it would
// cost to buy an equivalent item in El Salvador. This is the owner's
// declared_value, the base for the renter's damage-liability hold (35%,
// capped per category), so the owner always sets the final number.
// Results are cached for 14 days in price_suggestions_cache under a
// "replacement:<slug>" category, so they never mix with daily-price rows.
//
// Sugiere un rango de valor de reposición al publicar. El dueño decide
// el valor final.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000
const HARD_CEILING = 10000 // USD, keeps an obviously wrong answer from setting a huge hold
const GEMINI_MODEL = 'gemini-3.6-flash' // mismo modelo que suggest-price

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

async function sha256Hex(message: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

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

  try {
    const { category, title, description, condition } = await request.json()

    if (typeof category !== 'string' || !category.trim()) {
      return json({ error: 'category is required' }, 400)
    }
    const cleanTitle = typeof title === 'string' ? title.trim().slice(0, 150) : ''
    const cleanDescription = typeof description === 'string' ? description.trim().slice(0, 2000) : ''
    if (cleanTitle.length < 3 && cleanDescription.length < 10) {
      return json({ error: 'Add a title or a description first' }, 400)
    }
    const cleanCondition = typeof condition === 'string' && condition ? condition : 'not specified'

    const admin = createClient(supabaseUrl, serviceKey)

    const { data: categoryRow } = await admin.from('categories').select('id, name').eq('slug', category).maybeSingle()
    if (!categoryRow) return json({ error: 'Unknown category' }, 400)

    const cacheCategory = `replacement:${category}`
    const cacheKey = await sha256Hex(`${category}:${norm(cleanTitle)}:${norm(cleanDescription)}:${cleanCondition}`)

    const { data: cached } = await admin
      .from('price_suggestions_cache')
      .select('min_price, max_price, reasoning, created_at')
      .eq('category', cacheCategory)
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS) {
      return json({
        min: Number(cached.min_price),
        max: Number(cached.max_price),
        reasoning: cached.reasoning,
        cached: true,
      })
    }

    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) return json({ error: 'Value suggestions are not configured yet.' }, 500)

    const systemPrompt = `You estimate the REPLACEMENT VALUE in USD of items listed on Lendrop, a peer-to-peer rental marketplace in El Salvador: what it would cost the owner to buy an equivalent item (same kind, similar quality and condition) in El Salvador today.

Rules:
- Use your knowledge of the specific brand/model when one is given; otherwise use typical prices for that kind of item.
- Account for the stated condition (a used item is worth less than new).
- Give a realistic range, not a single number. Never exceed $${HARD_CEILING}.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"min": <number>, "max": <number>, "reasoning": "<one short sentence in English>"}`

    const userPrompt = `Category: ${categoryRow.name}
Title: ${cleanTitle || '(none)'}
Condition: ${cleanCondition}
Description: ${cleanDescription || '(none)'}`

    let aiResponse: Response
    try {
      aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(12000),
      })
    } catch (e) {
      console.error('suggest-replacement-value: AI request failed', String(e))
      return json({ error: 'Could not generate a value suggestion right now.' }, 502)
    }

    if (!aiResponse.ok) {
      console.error('suggest-replacement-value: Gemini API error', aiResponse.status, await aiResponse.text())
      return json({ error: 'Could not generate a value suggestion right now.' }, 502)
    }

    const aiData = await aiResponse.json()
    const rawText: string = aiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    let parsed: { min?: unknown; max?: unknown; reasoning?: unknown }
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : rawText)
    } catch {
      console.error('suggest-replacement-value: could not parse model output', { rawText })
      return json({ error: 'Could not parse the value suggestion.' }, 502)
    }

    const rawMin = Number(parsed.min)
    const rawMax = Number(parsed.max)
    if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax) || rawMin <= 0 || rawMax <= 0) {
      return json({ error: 'Could not generate a valid value suggestion.' }, 502)
    }

    // Never trust the model blindly: whole dollars, clamp to the ceiling,
    // and make sure min <= max regardless of what it returned.
    const max = Math.round(Math.min(Math.max(rawMin, rawMax), HARD_CEILING))
    const min = Math.round(Math.min(Math.max(Math.min(rawMin, rawMax), 1), max))
    const reasoning =
      typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
        ? parsed.reasoning.trim().slice(0, 300)
        : `Estimated replacement cost for ${categoryRow.name} in El Salvador.`

    const { error: upsertError } = await admin.from('price_suggestions_cache').upsert(
      { category: cacheCategory, cache_key: cacheKey, min_price: min, max_price: max, reasoning, source: 'ai' },
      { onConflict: 'category,cache_key' }
    )
    if (upsertError) console.error('suggest-replacement-value: could not cache result', upsertError)

    return json({ min, max, reasoning, cached: false })
  } catch (err) {
    console.error('suggest-replacement-value: unexpected error', err)
    return json({ error: 'Something went wrong generating a value suggestion.' }, 500)
  }
})

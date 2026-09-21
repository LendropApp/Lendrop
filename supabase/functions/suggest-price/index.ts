// Fase 7 (PLAN_MVP_70.md): suggests a daily rental price range at
// publish time. Prefers real comparable listings already on Lendrop;
// falls back to Gemini only when there aren't enough of them.
// Results are cached in price_suggestions_cache for 14 days, keyed on
// category + a hash of the (normalized) description, so repeat calls
// for a near-identical listing don't re-hit the model.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000
const HARD_CEILING = 100 // USD/day — accessible-market ceiling for the AI fallback path.
const MIN_COMPARABLES = 3
const GEMINI_MODEL = 'gemini-2.5-flash'

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
  const enc = new TextEncoder()
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(message))
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function normalizeDescription(description: string) {
  return description.trim().toLowerCase().replace(/\s+/g, ' ')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  try {
    const { category, description, condition } = await request.json()

    if (typeof category !== 'string' || !category.trim()) {
      return json({ error: 'category is required' }, 400)
    }
    if (typeof description !== 'string' || description.trim().length < 10) {
      return json({ error: 'description must be at least 10 characters' }, 400)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const normalizedDescription = normalizeDescription(description)
    const cacheKey = await sha256Hex(`${category}:${normalizedDescription}`)

    const { data: cached } = await admin
      .from('price_suggestions_cache')
      .select('min_price, max_price, reasoning, source, created_at')
      .eq('category', category)
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (cached && Date.now() - new Date(cached.created_at).getTime() < CACHE_TTL_MS) {
      return json({
        min: Number(cached.min_price),
        max: Number(cached.max_price),
        reasoning: cached.reasoning,
        source: cached.source,
        cached: true,
      })
    }

    const { data: categoryRow, error: categoryError } = await admin
      .from('categories')
      .select('id, name')
      .eq('slug', category)
      .maybeSingle()

    if (categoryError || !categoryRow) return json({ error: 'Unknown category' }, 400)

    const { data: comparableItems, error: comparablesError } = await admin
      .from('items')
      .select('price_per_day')
      .eq('category_id', categoryRow.id)

    if (comparablesError) return json({ error: 'Could not load comparable listings' }, 500)

    const comparablePrices = (comparableItems ?? [])
      .map((item) => Number(item.price_per_day))
      .filter((price) => Number.isFinite(price) && price > 0)

    let min: number
    let max: number
    let reasoning: string
    let source: 'comparables' | 'ai'

    if (comparablePrices.length >= MIN_COMPARABLES) {
      min = Math.min(...comparablePrices)
      max = Math.max(...comparablePrices)
      reasoning = `Based on ${comparablePrices.length} comparable listings in ${categoryRow.name} on Lendrop, ranging from $${min.toFixed(2)} to $${max.toFixed(2)}/day.`
      source = 'comparables'
    } else {
      const geminiKey = Deno.env.get('GEMINI_API_KEY')
      if (!geminiKey) return json({ error: 'Price suggestions are not configured yet.' }, 500)

      const systemPrompt = `You suggest daily rental prices in USD for a peer-to-peer rental marketplace in El Salvador (Lendrop). Prices must stay affordable for the local market — a hard ceiling of $${HARD_CEILING}/day applies no matter what you think the item is worth.

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"min": <number>, "max": <number>, "reasoning": "<one short sentence>"}`

      const userPrompt = `Category: ${categoryRow.name}
Condition: ${typeof condition === 'string' && condition ? condition : 'not specified'}
Description: ${description}`

      const aiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': geminiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 300, responseMimeType: 'application/json' },
          }),
        }
      )

      if (!aiResponse.ok) {
        console.error('suggest-price: Gemini API error', aiResponse.status, await aiResponse.text())
        return json({ error: 'Could not generate a price suggestion right now.' }, 502)
      }

      const aiData = await aiResponse.json()
      const candidate = aiData?.candidates?.[0]
      if (!candidate?.content) {
        throw new Error(`Gemini returned no usable candidate (finishReason: ${candidate?.finishReason ?? 'unknown'})`)
      }
      const rawText: string = candidate.content?.parts?.[0]?.text ?? ''

      let parsed: { min?: unknown; max?: unknown; reasoning?: unknown }
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
      } catch {
        console.error('suggest-price: could not parse model output', rawText)
        return json({ error: 'Could not parse the price suggestion.' }, 502)
      }

      const rawMin = Number(parsed.min)
      const rawMax = Number(parsed.max)
      if (!Number.isFinite(rawMin) || !Number.isFinite(rawMax) || rawMin <= 0) {
        return json({ error: 'Could not generate a valid price suggestion.' }, 502)
      }

      // Never trust the model blindly — clamp to the hard ceiling and
      // make sure min <= max regardless of what it returned.
      max = Math.min(rawMax, HARD_CEILING)
      min = Math.min(Math.max(rawMin, 1), max)
      reasoning =
        typeof parsed.reasoning === 'string' && parsed.reasoning.trim()
          ? parsed.reasoning.trim().slice(0, 300)
          : `Estimated accessible market price for ${categoryRow.name} in El Salvador.`
      source = 'ai'
    }

    const { error: upsertError } = await admin.from('price_suggestions_cache').upsert(
      {
        category,
        cache_key: cacheKey,
        min_price: min,
        max_price: max,
        reasoning,
        source,
      },
      { onConflict: 'category,cache_key' }
    )
    if (upsertError) console.error('suggest-price: could not cache result', upsertError)

    return json({ min, max, reasoning, source, cached: false })
  } catch (err) {
    console.error('suggest-price: unexpected error', err)
    return json({ error: 'Something went wrong generating a price suggestion.' }, 500)
  }
})

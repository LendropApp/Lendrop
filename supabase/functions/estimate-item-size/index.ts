// estimate-item-size
// Al publicar, estima con IA las medidas EMPACADAS del artículo (listo para
// dejar en el locker: en su estuche, funda o caja) y recomienda el tamaño de
// compartimento. La recomendación final NO la decide la IA: se calcula en la
// BD con compute_required_locker_size (misma regla que usa el trigger al guardar).
// El dueño siempre puede corregir las medidas antes de publicar.
// Si la IA falla, responde con el tamaño por defecto de la categoría.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_MODEL = 'gemini-3.6-flash' // mismo modelo que suggest-price
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000
const SAFETY_MARGIN = 1.05 // +5 %: mejor sobrestimar un poco que asignar un compartimento donde no cabe

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
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)
const round1 = (n: number) => Math.ceil(n * 10) / 10

type Estimate = {
  length_cm: number
  width_cm: number
  height_cm: number
  weight_kg: number
  confidence: 'high' | 'medium' | 'low'
  packaging: string
  reasoning: string
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

  let body: { category?: unknown; title?: unknown; description?: unknown }
  try {
    body = await request.json()
  } catch {
    return json({ error: 'INVALID_JSON' }, 400)
  }
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, 150) : ''
  const description = typeof body.description === 'string' ? body.description.trim().slice(0, 2000) : ''
  if (!category) return json({ error: 'CATEGORY_REQUIRED' }, 400)
  if (title.length < 3) return json({ error: 'TITLE_REQUIRED', message: 'Escribe el nombre del artículo para estimar su tamaño.' }, 400)

  const admin = createClient(supabaseUrl, serviceKey)

  const { data: categoryRow } = await admin
    .from('categories')
    .select('id, name, default_locker_size')
    .eq('slug', category)
    .maybeSingle()
  if (!categoryRow) return json({ error: 'UNKNOWN_CATEGORY' }, 400)

  const { data: sizeClasses } = await admin
    .from('locker_size_classes')
    .select('code, label, rank, inner_height_cm, inner_width_cm, inner_depth_cm, max_weight_kg')
    .eq('is_active', true)
    .order('rank')

  const sizeInfo = (code: string | null) => {
    const s = (sizeClasses ?? []).find((c) => c.code === code)
    return s
      ? {
          code: s.code,
          label: s.label,
          innerCm: { height: Number(s.inner_height_cm), width: Number(s.inner_width_cm), depth: Number(s.inner_depth_cm) },
          maxWeightKg: Number(s.max_weight_kg),
        }
      : null
  }

  const fallback = (reason: string) =>
    json({
      source: 'category_default',
      dimensions: null,
      weightKg: null,
      confidence: 'low',
      packaging: null,
      reasoning: `Tamaño típico para ${categoryRow.name}. Ingresa las medidas reales para una recomendación exacta.`,
      fitsInLockers: Boolean(categoryRow.default_locker_size),
      recommendedSize: sizeInfo(categoryRow.default_locker_size),
      fallbackReason: reason,
    })

  // Caché
  const cacheKey = await sha256Hex(`${category}:${norm(title)}:${norm(description)}`)
  let estimate: Estimate | null = null
  let cached = false

  const { data: cacheRow } = await admin.from('size_estimates_cache').select('*').eq('cache_key', cacheKey).maybeSingle()
  if (cacheRow && Date.now() - new Date(cacheRow.created_at).getTime() < CACHE_TTL_MS) {
    estimate = {
      length_cm: Number(cacheRow.length_cm),
      width_cm: Number(cacheRow.width_cm),
      height_cm: Number(cacheRow.height_cm),
      weight_kg: Number(cacheRow.weight_kg),
      confidence: cacheRow.confidence,
      packaging: cacheRow.packaging ?? '',
      reasoning: cacheRow.reasoning ?? '',
    }
    cached = true
  }

  if (!estimate) {
    const geminiKey = Deno.env.get('GEMINI_API_KEY')
    if (!geminiKey) return fallback('ai_not_configured')

    const systemPrompt = `You estimate the PACKED dimensions and weight of items listed on Lendrop, a peer-to-peer rental marketplace in El Salvador where items are handed over through smart lockers.

"Packed" means how the owner would realistically place it in a locker: inside its usual case, bag, garment bag or box (camera in its bag, drone in its case, guitar in its gig bag, tent in its sack, clothing folded in a box or garment bag, bicycle whole with handlebars turned sideways).

Rules:
- Use your knowledge of the specific brand/model when one is given; otherwise use typical sizes for that kind of item.
- Return the three outer dimensions in centimeters (length >= width >= height) and weight in kilograms.
- Be realistic, never optimistic: if unsure, round UP.
- confidence: "high" if a specific known model is identifiable, "medium" for a clear generic item, "low" if the description is vague.
- packaging and reasoning: short, in Spanish.

Respond with ONLY this JSON, no other text:
{"length_cm": <number>, "width_cm": <number>, "height_cm": <number>, "weight_kg": <number>, "confidence": "high"|"medium"|"low", "packaging": "<como va empacado>", "reasoning": "<una frase corta>"}`

    const userPrompt = `Category: ${categoryRow.name}\nTitle: ${title}\nDescription: ${description || '(none)'}`

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
      console.error('estimate-item-size: AI request failed', String(e))
      return fallback('ai_unavailable')
    }

    if (!aiResponse.ok) {
      console.error('estimate-item-size: Gemini error', aiResponse.status, await aiResponse.text())
      return fallback('ai_error')
    }

    try {
      const aiData = await aiResponse.json()
      const rawText: string = aiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      const match = rawText.match(/\{[\s\S]*\}/)
      // deno-lint-ignore no-explicit-any
      const p: any = JSON.parse(match ? match[0] : rawText)

      const dims = [Number(p.length_cm), Number(p.width_cm), Number(p.height_cm)]
      const kg = Number(p.weight_kg)
      if (dims.some((d) => !Number.isFinite(d) || d <= 0) || !Number.isFinite(kg) || kg <= 0) {
        throw new Error('invalid numbers')
      }
      // Nunca confiar ciegamente en el modelo: ordenar, margen de seguridad, límites
      const [l, w, h] = dims.sort((a, b) => b - a).map((d) => round1(clamp(d * SAFETY_MARGIN, 1, 300)))
      estimate = {
        length_cm: l,
        width_cm: w,
        height_cm: h,
        weight_kg: Math.ceil(clamp(kg * SAFETY_MARGIN, 0.05, 200) * 100) / 100,
        confidence: ['high', 'medium', 'low'].includes(p.confidence) ? p.confidence : 'low',
        packaging: typeof p.packaging === 'string' ? p.packaging.trim().slice(0, 120) : '',
        reasoning: typeof p.reasoning === 'string' ? p.reasoning.trim().slice(0, 300) : '',
      }
    } catch (e) {
      console.error('estimate-item-size: could not parse model output', String(e))
      return fallback('ai_parse_error')
    }

    const { error: cacheErr } = await admin.from('size_estimates_cache').upsert({ cache_key: cacheKey, ...estimate })
    if (cacheErr) console.error('estimate-item-size: cache write failed', cacheErr.message)
  }

  // La recomendación la calcula la BD con la misma regla que el trigger de items
  const { data: sizeCode, error: sizeErr } = await admin.rpc('compute_required_locker_size', {
    p_l: estimate.length_cm,
    p_w: estimate.width_cm,
    p_h: estimate.height_cm,
    p_kg: estimate.weight_kg,
  })
  if (sizeErr) {
    console.error('estimate-item-size: size computation failed', sizeErr.message)
    return json({ error: 'SIZE_COMPUTATION_FAILED' }, 500)
  }

  return json({
    source: 'ai',
    cached,
    dimensions: { lengthCm: estimate.length_cm, widthCm: estimate.width_cm, heightCm: estimate.height_cm },
    weightKg: estimate.weight_kg,
    confidence: estimate.confidence,
    packaging: estimate.packaging,
    reasoning: estimate.reasoning,
    fitsInLockers: Boolean(sizeCode),
    recommendedSize: sizeInfo(sizeCode ?? null),
  })
})

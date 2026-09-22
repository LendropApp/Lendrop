import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Info, Ruler, Sparkles, Weight } from 'lucide-react'
import { estimateItemSize, computeRequiredLockerSize, getLockerSizeClasses } from '../../services/items/sizeService'

const CONFIDENCE_COPY = {
  high: { label: 'Estimación precisa', tone: 'text-emerald-700 bg-emerald-100' },
  medium: { label: 'Estimación aproximada', tone: 'text-amber-700 bg-amber-100' },
  low: { label: 'Verifica las medidas', tone: 'text-red-700 bg-red-100' },
}

const XLARGE_LIMITS = { height: 190, width: 110, depth: 60, weight: 40 }

function SizeScaleIllustration({ sizeClasses, recommendedCode }) {
  if (!sizeClasses.length) return null
  const maxHeight = Math.max(...sizeClasses.map((s) => Number(s.inner_height_cm)))
  const scale = 64 / maxHeight

  return (
    <div className="flex items-end justify-center gap-4 py-2" aria-hidden="true">
      {[...sizeClasses]
        .sort((a, b) => a.rank - b.rank)
        .map((s) => {
          const active = s.code === recommendedCode
          const h = Math.max(Number(s.inner_height_cm) * scale, 6)
          const w = Math.max(Number(s.inner_width_cm) * scale * 0.55, 14)
          return (
            <div key={s.code} className="flex flex-col items-center gap-1">
              <div
                style={{ height: `${h}px`, width: `${w}px` }}
                className={`rounded-sm border-2 transition ${
                  active
                    ? 'border-deep-purple bg-lavender/30 shadow-[0_0_0_3px_rgba(165,140,244,0.25)]'
                    : 'border-jet-black/15 bg-jet-black/[0.03]'
                }`}
              />
              <span className={`font-mono text-[10px] font-semibold ${active ? 'text-deep-purple' : 'text-jet-black/35'}`}>
                {s.label}
              </span>
            </div>
          )
        })}
    </div>
  )
}

// Auto-estimates an item's packed size from its category/title/description
// (debounced re-estimate while those change), lets the owner adjust the
// measurements with a live client-side preview of the same fit rule the
// database uses, and blocks the flow entirely when nothing fits.
// Reports the values to save back to the parent via onChange -- this
// component owns none of the actual save.
export default function ItemSizeStep({ category, title, description, initialDimensions, onChange }) {
  const [sizeClasses, setSizeClasses] = useState([])
  const [phase, setPhase] = useState(initialDimensions ? 'idle' : 'loading') // loading | result | fallback | error | idle
  const [estimate, setEstimate] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  const [editing, setEditing] = useState(false)
  const [userEdited, setUserEdited] = useState(Boolean(initialDimensions))
  const [lengthCm, setLengthCm] = useState(initialDimensions?.lengthCm ?? '')
  const [widthCm, setWidthCm] = useState(initialDimensions?.widthCm ?? '')
  const [heightCm, setHeightCm] = useState(initialDimensions?.heightCm ?? '')
  const [weightKg, setWeightKg] = useState(initialDimensions?.weightKg ?? '')

  const debounceRef = useRef(null)
  const lastRequestKey = useRef('')

  useEffect(() => {
    getLockerSizeClasses()
      .then(setSizeClasses)
      .catch(() => setSizeClasses([]))
  }, [])

  const runEstimate = useRef(async (cat, t, desc) => {
    setPhase('loading')
    setErrorMessage('')
    try {
      const result = await estimateItemSize({ category: cat, title: t, description: desc })
      setEstimate(result)
      if (result.source === 'category_default') {
        setPhase('fallback')
      } else {
        setPhase('result')
        if (result.confidence === 'low') setEditing(true)
      }
      if (!userEdited) {
        setLengthCm(result.dimensions?.lengthCm ?? '')
        setWidthCm(result.dimensions?.widthCm ?? '')
        setHeightCm(result.dimensions?.heightCm ?? '')
        setWeightKg(result.weightKg ?? '')
      }
    } catch (err) {
      setPhase('error')
      setErrorMessage(err?.message || 'No se pudo estimar el tamaño.')
    }
  })

  // Auto-estimate on entering the step, then re-estimate (debounced) if
  // title/category/description change -- but only while the owner hasn't
  // taken over with their own measurements.
  useEffect(() => {
    if (initialDimensions) return // editing an existing item: don't re-estimate over saved values
    if (userEdited) return
    if (!category || title.trim().length < 3) return

    const key = `${category}:${title.trim()}:${description.trim()}`
    if (key === lastRequestKey.current) return

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      lastRequestKey.current = key
      runEstimate.current(category, title, description)
    }, 800)

    return () => clearTimeout(debounceRef.current)
  }, [category, title, description, userEdited, initialDimensions])

  // Recompute the fit preview (client-side mirror of compute_required_
  // locker_size) whenever the effective measurements change, and report
  // up to the parent.
  useEffect(() => {
    const l = Number(lengthCm)
    const w = Number(widthCm)
    const h = Number(heightCm)
    const kg = Number(weightKg)
    const hasDims = lengthCm !== '' && widthCm !== '' && heightCm !== ''

    if (!hasDims || sizeClasses.length === 0) {
      onChange?.({ lengthCm: null, widthCm: null, heightCm: null, weightKg: null, blocked: false })
      return
    }

    const fit = computeRequiredLockerSize(l, w, h, kg, sizeClasses)
    onChange?.({
      lengthCm: l,
      widthCm: w,
      heightCm: h,
      weightKg: kg || null,
      blocked: !fit,
    })
  }, [lengthCm, widthCm, heightCm, weightKg, sizeClasses]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleManualChange(setter) {
    return (e) => {
      setUserEdited(true)
      setter(e.target.value)
    }
  }

  const previewFit =
    lengthCm !== '' && widthCm !== '' && heightCm !== ''
      ? computeRequiredLockerSize(Number(lengthCm), Number(widthCm), Number(heightCm), Number(weightKg) || 0, sizeClasses)
      : null
  const blocked = (lengthCm !== '' && widthCm !== '' && heightCm !== '' && !previewFit) || estimate?.fitsInLockers === false

  if (!category || title.trim().length < 3) {
    return (
      <section aria-live="polite">
        <label className="mb-2 block text-sm font-medium text-jet-black">Tamaño</label>
        <p className="text-xs text-jet-black/45">
          Elige una categoría y escribe un título para estimar el tamaño de tu artículo.
        </p>
      </section>
    )
  }

  return (
    <section aria-live="polite">
      <label className="mb-2 block text-sm font-medium text-jet-black">Tamaño</label>

      {phase === 'loading' && (
        <div className="animate-pulse space-y-2 rounded-2xl border border-lavender/15 bg-white p-4">
          <div className="h-3 w-40 rounded bg-jet-black/10" />
          <div className="h-16 rounded bg-jet-black/5" />
          <p className="pt-1 text-xs text-jet-black/40">Estimando el tamaño de tu artículo…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="rounded-2xl border border-jet-black/10 bg-jet-black/[0.02] p-4 text-xs text-jet-black/50">
          {errorMessage} Puedes ingresar las medidas manualmente abajo.
        </div>
      )}

      {(phase === 'result' || phase === 'fallback') && estimate && (
        <div className="space-y-3 rounded-2xl border border-lavender/15 bg-white p-4">
          {phase === 'fallback' ? (
            <div className="flex items-start gap-2 rounded-xl bg-jet-black/[0.03] p-3 text-xs text-jet-black/60">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-jet-black/40" />
              <span>{estimate.reasoning}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-lavender" />
                <span className="font-mono text-lg font-bold text-jet-black">
                  Locker {estimate.recommendedSize?.label ?? '—'}
                </span>
              </div>
              {estimate.confidence && (
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${CONFIDENCE_COPY[estimate.confidence]?.tone ?? ''}`}
                >
                  {CONFIDENCE_COPY[estimate.confidence]?.label ?? estimate.confidence}
                </span>
              )}
            </div>
          )}

          {estimate.recommendedSize && (
            <p className="text-xs text-jet-black/50">
              Compartimiento interior: {estimate.recommendedSize.innerCm.height}×{estimate.recommendedSize.innerCm.width}×
              {estimate.recommendedSize.innerCm.depth} cm · hasta {estimate.recommendedSize.maxWeightKg} kg
            </p>
          )}

          {estimate.dimensions && (
            <p className="text-xs text-jet-black/60">
              Medidas estimadas empacado:{' '}
              <span className="font-mono">
                {estimate.dimensions.lengthCm}×{estimate.dimensions.widthCm}×{estimate.dimensions.heightCm} cm
              </span>
              {estimate.weightKg ? (
                <>
                  {' '}
                  · <span className="font-mono">{estimate.weightKg} kg</span>
                </>
              ) : null}
              {estimate.packaging ? <span className="text-jet-black/45"> — {estimate.packaging}</span> : null}
            </p>
          )}

          <SizeScaleIllustration sizeClasses={sizeClasses} recommendedCode={estimate.recommendedSize?.code} />

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs font-semibold text-deep-purple hover:text-lavender"
            >
              Ajustar medidas
            </button>
          ) : null}
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-3 rounded-2xl border border-lavender/15 bg-white p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-jet-black/60">
            <Ruler className="h-3.5 w-3.5" />
            Medidas del artículo empacado
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label htmlFor="size-length" className="mb-1 block text-[11px] text-jet-black/50">
                Largo (cm)
              </label>
              <input
                id="size-length"
                type="number"
                inputMode="decimal"
                min="1"
                max="300"
                step="0.1"
                value={lengthCm}
                onChange={handleManualChange(setLengthCm)}
                className="w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="size-width" className="mb-1 block text-[11px] text-jet-black/50">
                Ancho (cm)
              </label>
              <input
                id="size-width"
                type="number"
                inputMode="decimal"
                min="1"
                max="300"
                step="0.1"
                value={widthCm}
                onChange={handleManualChange(setWidthCm)}
                className="w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="size-height" className="mb-1 block text-[11px] text-jet-black/50">
                Alto (cm)
              </label>
              <input
                id="size-height"
                type="number"
                inputMode="decimal"
                min="1"
                max="300"
                step="0.1"
                value={heightCm}
                onChange={handleManualChange(setHeightCm)}
                className="w-full rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="size-weight" className="mb-1 flex items-center gap-1.5 text-[11px] text-jet-black/50">
              <Weight className="h-3 w-3" />
              Peso (kg)
            </label>
            <input
              id="size-weight"
              type="number"
              inputMode="decimal"
              min="0.05"
              max="200"
              step="0.1"
              value={weightKg}
              onChange={handleManualChange(setWeightKg)}
              className="w-full max-w-[140px] rounded-lg border border-jet-black/10 px-3 py-2 font-mono text-sm focus:border-lavender focus:outline-none"
            />
          </div>

          {previewFit && (
            <p className="text-xs text-jet-black/60">
              Con estas medidas cabe en: <span className="font-mono font-semibold text-deep-purple">Locker {previewFit.label}</span>
            </p>
          )}
        </div>
      )}

      {blocked && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              Este artículo es demasiado grande para nuestros lockers (máx. {XLARGE_LIMITS.height}×{XLARGE_LIMITS.width}×
              {XLARGE_LIMITS.depth} cm, {XLARGE_LIMITS.weight} kg).
            </p>
            <p className="mt-1 text-xs text-red-600">No se puede publicar como disponible. Revisa las medidas ingresadas.</p>
          </div>
        </div>
      )}
    </section>
  )
}

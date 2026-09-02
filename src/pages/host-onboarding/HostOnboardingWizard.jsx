import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const STEPS = ['intro', 'contact', 'coverage', 'categories', 'terms', 'success']

export default function HostOnboardingWizard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [record, setRecord] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Carga el registro de onboarding, o lo crea si es la primera vez que el usuario llega aquí
  useEffect(() => {
    if (!user) return

    ;(async () => {
      const { data, error } = await supabase
        .from('host_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error cargando host_onboarding:', error)
        setLoading(false)
        return
      }

      if (data) {
        setRecord(data)
        setStepIndex(Math.max(STEPS.indexOf(data.current_step), 0))
      } else {
        const { data: created, error: insertError } = await supabase
          .from('host_onboarding')
          .insert({ user_id: user.id, current_step: 'intro' })
          .select()
          .single()
        if (insertError) console.error('Error creando host_onboarding:', insertError)
        setRecord(created)
      }
      setLoading(false)
    })()
  }, [user])

  const persist = useCallback(
    async (patch) => {
      const { data, error } = await supabase
        .from('host_onboarding')
        .update(patch)
        .eq('user_id', user.id)
        .select()
        .single()
      if (error) {
        console.error('Error guardando paso:', error)
        return
      }
      setRecord(data)
    },
    [user]
  )

  const goNext = useCallback(
    async (patch = {}) => {
      const nextIndex = Math.min(stepIndex + 1, STEPS.length - 1)
      await persist({ ...patch, current_step: STEPS[nextIndex] })
      setStepIndex(nextIndex)
    },
    [stepIndex, persist]
  )

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0))
  }, [])

  const finish = useCallback(async () => {
    await supabase
      .from('host_onboarding')
      .update({ completed_at: new Date().toISOString(), current_step: 'success' })
      .eq('user_id', user.id)

    await supabase
      .from('profiles')
      .update({ is_host: true, host_activated_at: new Date().toISOString() })
      .eq('id', user.id)

    setStepIndex(STEPS.length - 1)
  }, [user])

  if (loading || !record) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-white">
        <div className="animate-pulse font-display text-deep-purple">Cargando…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-soft-white flex flex-col">
      {stepIndex > 0 && stepIndex < STEPS.length - 1 && (
        <ProgressBar current={stepIndex} total={STEPS.length - 2} />
      )}
      <div className="flex-1 flex items-center justify-center px-6 py-10">
        <p className="font-display text-xl text-deep-purple">
          Step {stepIndex + 1} of {STEPS.length}: {STEPS[stepIndex]}
        </p>
      </div>
    </div>
  )
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="h-1 w-full bg-lavender/20">
      <div className="h-1 bg-deep-purple transition-all duration-300" style={{ width: `${pct}%` }} />
    </div>
  )
}
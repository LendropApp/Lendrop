import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import IntroStep from './IntroStep'
import ContactCityStep from './ContactCityStep'
import CoverageStep from './CoverageStep'
import CategoriesStep from './CategoriesStep'
import TermsStep from './TermsStep'
import SuccessStep from './SuccessStep'

const STEPS = ['intro', 'contact', 'coverage', 'categories', 'terms', 'success']

export default function HostOnboardingWizard() {
  const { user, refreshProfile } = useAuth()
  const [record, setRecord] = useState(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [finishing, setFinishing] = useState(false)

  // Loads the onboarding record, or creates it if this is the user's first time here
  useEffect(() => {
    if (!user) return

    ;(async () => {
      const { data, error } = await supabase
        .from('host_onboarding')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Error loading host_onboarding:', error)
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
        if (insertError) console.error('Error creating host_onboarding:', insertError)
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
        console.error('Error saving step:', error)
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

  const finish = useCallback(
    async (patch = {}) => {
      setFinishing(true)

      await persist({ ...patch, current_step: 'terms' })

      await supabase
        .from('host_onboarding')
        .update({ completed_at: new Date().toISOString(), current_step: 'success' })
        .eq('user_id', user.id)

      await supabase
        .from('profiles')
        .update({ is_host: true, host_activated_at: new Date().toISOString() })
        .eq('id', user.id)

      await refreshProfile()

      setFinishing(false)
      setStepIndex(STEPS.length - 1)
    },
    [user, persist, refreshProfile]
  )

  const renderStep = () => {
    switch (STEPS[stepIndex]) {
      case 'intro':
        return <IntroStep onNext={() => goNext()} />
      case 'contact':
        return <ContactCityStep record={record} onNext={(patch) => goNext(patch)} onBack={goBack} />
      case 'coverage':
        return <CoverageStep record={record} onNext={(patch) => goNext(patch)} onBack={goBack} />
      case 'categories':
        return <CategoriesStep record={record} onNext={(patch) => goNext(patch)} onBack={goBack} />
      case 'terms':
        return <TermsStep onNext={(patch) => finish(patch)} onBack={goBack} submitting={finishing} />
      case 'success':
        return <SuccessStep />
      default:
        return null
    }
  }

  if (loading || !record) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="animate-pulse font-display text-primary">Loading…</div>
      </div>
    )
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-bg flex flex-col">
      {stepIndex > 0 && stepIndex < STEPS.length - 1 && (
        <ProgressBar current={stepIndex} total={STEPS.length - 2} />
      )}
      <div className="relative flex-1 flex items-center justify-center px-6 py-10">
        {renderStep()}
      </div>
    </div>
  )
}

function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100)
  return (
    <div className="relative h-1 w-full bg-surface-raised">
      <div
        className="h-1 cta-brand transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
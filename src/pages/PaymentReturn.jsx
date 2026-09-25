import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Clock3 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function PaymentReturn() {
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservation_id')
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!reservationId) return
    let cancelled = false
    let timer
    async function check() {
      const { data } = await supabase.from('payments').select('status').eq('reservation_id', reservationId).maybeSingle()
      if (cancelled) return
      if (data?.status === 'paid') setStatus('paid')
      else timer = setTimeout(check, 3000)
    }
    check()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [reservationId])

  const paid = status === 'paid'
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-6 text-center">
      <div className="max-w-md">
        {paid ? <CheckCircle2 className="mx-auto h-14 w-14 text-success" aria-hidden="true" /> : <Clock3 className="mx-auto h-14 w-14 text-primary" aria-hidden="true" />}
        <h1 className="mt-5 text-3xl font-extrabold">{paid ? 'Payment confirmed' : 'Checking your payment'}</h1>
        <p role="status" className="mt-2 text-sm text-text-muted">
          {paid ? 'Your reservation is confirmed.' : 'Wompi is confirming the payment. This page will update automatically.'}
        </p>
        <Link to="/history" className="cta-brand mt-6 inline-block rounded-xl px-6 py-3 text-sm font-bold text-soft-white">
          View activity
        </Link>
      </div>
    </main>
  )
}
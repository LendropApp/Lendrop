import { useEffect, useState } from 'react'
import '../style/Payment.css'
import { supabase } from '../lib/supabaseClient'

const order = {
  reference: `LENDROP-${Date.now()}`,
  product: {
    name: 'Traje de saco azul marino',
    description:
      'Traje completo que incluye saco, corbata y camisa manga larga color celeste.',
    image: '/images/traje.jpg',
  },
  subtotal: 90,
  serviceFee: 11,
  deposit: 4,
  total: 105,
}

export default function Payment() {
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const existingScript = document.querySelector(
      'script[src="https://checkout.wompi.co/widget.js"]'
    )

    if (existingScript) return

    const script = document.createElement('script')
    script.src = 'https://checkout.wompi.co/widget.js'
    script.async = true

    document.body.appendChild(script)

    return () => {
      script.remove()
    }
  }, [])

  async function handlePayment() {
    if (!window.WidgetCheckout) {
      setStatus('El sistema de pagos todavía está cargando. Intenta nuevamente.')
      return
    }

    setProcessing(true)
    setStatus('')

    try {
      const amountInCents = Math.round(order.total * 100)

      /*
       * La firma de integridad se genera en el servidor.
       * Nunca debemos colocar el secreto de Wompi directamente
       * dentro de React.
       */
      const { data, error } = await supabase.functions.invoke(
        'wompi-signature',
        {
          body: {
            reference: order.reference,
            amountInCents,
            currency: 'USD',
          },
        }
      )

      if (error) {
        throw error
      }

      if (!data?.signature) {
        throw new Error('No se recibió la firma de integridad.')
      }

      const publicKey = import.meta.env.VITE_WOMPI_PUBLIC_KEY

      if (!publicKey) {
        throw new Error('Falta configurar la llave pública de Wompi.')
      }

      const checkout = new window.WidgetCheckout({
        currency: 'USD',
        amountInCents,
        reference: order.reference,
        publicKey,
        signature: {
          integrity: data.signature,
        },
        redirectUrl: `${window.location.origin}/payment-result`,
      })

      checkout.open((result) => {
        setProcessing(false)

        const transaction = result?.transaction

        console.log('Resultado de Wompi:', transaction)

        if (!transaction) {
          setStatus('No se recibió información de la transacción.')
          return
        }

        switch (transaction.status) {
          case 'APPROVED':
            setStatus('Pago aprobado correctamente.')
            break

          case 'DECLINED':
            setStatus('El pago fue rechazado.')
            break

          case 'PENDING':
            setStatus('El pago está pendiente de confirmación.')
            break

          default:
            setStatus(
              `Estado de la transacción: ${transaction.status}`
            )
        }
      })
    } catch (error) {
      console.error('Error al iniciar el pago:', error)

      setStatus(
        error.message || 'No se pudo iniciar el proceso de pago.'
      )

      setProcessing(false)
    }
  }

  return (
    <main className="payment-page">
      <section className="payment-container">
        <div className="payment-header">
          <span className="payment-eyebrow">LENDROP CHECKOUT</span>

          <h1 className="payment-title">
            Finaliza tu alquiler
          </h1>

          <p className="payment-description">
            Revisa los detalles de tu alquiler antes de continuar
            con el pago.
          </p>
        </div>

        <div className="payment-grid">
          <article className="product-card">
            <img
              src={order.product.image}
              alt={order.product.name}
              className="product-image"
            />

            <div className="product-content">
              <span className="product-label">ARTÍCULO</span>

              <h2>{order.product.name}</h2>

              <p>{order.product.description}</p>
            </div>
          </article>

          <article className="summary-card">
            <div className="summary-header">
              <h2>Resumen del alquiler</h2>
              <span>#{order.reference}</span>
            </div>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>${order.subtotal.toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <span>Comisión de servicio</span>
              <strong>${order.serviceFee.toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <span>Depósito de garantía</span>
              <strong>${order.deposit.toFixed(2)}</strong>
            </div>

            <div className="summary-divider" />

            <div className="summary-total">
              <span>Total</span>
              <strong>${order.total.toFixed(2)}</strong>
            </div>
          </article>
        </div>

        <section className="payment-action">
          <div>
            <span className="payment-label">TOTAL A PAGAR</span>
            <strong>${order.total.toFixed(2)}</strong>
          </div>

          <button
            type="button"
            className="pay-button"
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? 'Preparando pago...' : 'Pagar ahora'}
          </button>
        </section>

        {status && (
          <div className="payment-status" role="status">
            {status}
          </div>
        )}

        <p className="ssl-note">
          Tu pago será procesado de forma segura mediante Wompi.
        </p>
      </section>
    </main>
  )
}
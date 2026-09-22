// PaymentGateway: contrato que cualquier pasarela debe cumplir.
// Hoy: MockWompiGateway (pre-sandbox, no mueve dinero).
// Futuro: WompiSandboxGateway / WompiProductionGateway con el checkout
// alojado de Wompi. La lógica de negocio (apply_payment_result en la BD)
// no cambia al intercambiar la implementación.

export type ChargeOutcome = 'approved' | 'declined' | 'error'

export interface CardInput {
  number: string
  expMonth: number
  expYear: number
  cvc: string
  holderName: string
}

export interface ChargeRequest {
  paymentId: string
  amount: number
  currency: string
  card: CardInput
}

export interface ChargeResult {
  outcome: ChargeOutcome
  transactionId: string
  cardBrand: string
  cardLast4: string
  failureReason: string | null
  raw: Record<string, unknown>
}

export interface PaymentGateway {
  readonly name: string
  readonly environment: 'mock' | 'sandbox' | 'production'
  charge(req: ChargeRequest): Promise<ChargeResult>
}

export class CardValidationError extends Error {
  constructor(public code: string, message: string) {
    super(message)
  }
}

export function detectBrand(num: string): string {
  if (/^4/.test(num)) return 'VISA'
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'MASTERCARD'
  if (/^3[47]/.test(num)) return 'AMEX'
  return 'UNKNOWN'
}

function luhn(num: string): boolean {
  let sum = 0
  let dbl = false
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i])
    if (dbl) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    dbl = !dbl
  }
  return sum % 10 === 0
}

export function validateCard(card: CardInput): string {
  const num = String(card?.number ?? '').replace(/\s|-/g, '')
  if (!/^[0-9]{13,19}$/.test(num) || !luhn(num)) {
    throw new CardValidationError('INVALID_CARD_NUMBER', 'El número de tarjeta no es válido.')
  }
  const month = Number(card.expMonth)
  let year = Number(card.expYear)
  if (year < 100) year += 2000
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
    throw new CardValidationError('INVALID_EXPIRY', 'La fecha de vencimiento no es válida.')
  }
  const now = new Date()
  const expEnd = new Date(Date.UTC(year, month, 1))
  if (expEnd <= now) {
    throw new CardValidationError('CARD_EXPIRED', 'La tarjeta está vencida.')
  }
  const brand = detectBrand(num)
  const cvcLen = brand === 'AMEX' ? 4 : 3
  if (!new RegExp(`^[0-9]{${cvcLen}}$`).test(String(card.cvc ?? ''))) {
    throw new CardValidationError('INVALID_CVC', 'El código de seguridad no es válido.')
  }
  if (String(card.holderName ?? '').trim().length < 3) {
    throw new CardValidationError('INVALID_HOLDER', 'Escribe el nombre como aparece en la tarjeta.')
  }
  return num
}

// Tarjetas de prueba del modo mock (definidas por Lendrop, no por Wompi):
//   4242 4242 4242 4242 -> aprobada
//   4000 0000 0000 0002 -> rechazada (card_declined)
//   4000 0000 0000 9995 -> rechazada (insufficient_funds)
//   4000 0000 0000 0119 -> error de procesamiento
//   Cualquier otra tarjeta válida (Luhn) -> aprobada
const MOCK_RULES: Record<string, { outcome: ChargeOutcome; reason: string | null }> = {
  '4000000000000002': { outcome: 'declined', reason: 'card_declined' },
  '4000000000009995': { outcome: 'declined', reason: 'insufficient_funds' },
  '4000000000000119': { outcome: 'error', reason: 'processing_error' },
}

export class MockWompiGateway implements PaymentGateway {
  readonly name = 'wompi'
  readonly environment = 'mock' as const

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const num = validateCard(req.card)
    // Latencia realista de una pasarela (0.8–1.6 s)
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 800))
    const rule = MOCK_RULES[num] ?? { outcome: 'approved' as const, reason: null }
    const transactionId = `mock_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`
    return {
      outcome: rule.outcome,
      transactionId,
      cardBrand: detectBrand(num),
      cardLast4: num.slice(-4),
      failureReason: rule.reason,
      // Payload estilo webhook. NUNCA incluye número completo ni CVC.
      raw: {
        gateway: 'MockWompiGateway',
        environment: 'mock',
        transaction_id: transactionId,
        amount: req.amount,
        currency: req.currency,
        status: rule.outcome,
        reason: rule.reason,
        processed_at: new Date().toISOString(),
      },
    }
  }
}

export function resolveGateway(): PaymentGateway {
  const mode = Deno.env.get('PAYMENT_GATEWAY_MODE') ?? 'mock'
  switch (mode) {
    case 'mock':
      return new MockWompiGateway()
    // case 'sandbox': return new WompiSandboxGateway(...)   <- cuando exista
    default:
      throw new Error(`Unsupported PAYMENT_GATEWAY_MODE: ${mode}`)
  }
}

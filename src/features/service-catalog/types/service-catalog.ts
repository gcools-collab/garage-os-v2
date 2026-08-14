export const PRICING_TYPES = ["FIXED", "FROM", "QUOTE", "VARIABLE"] as const
export const PAYMENT_STRATEGIES = ["NO_PAYMENT", "FULL_PAYMENT", "DEPOSIT", "PAY_ON_SITE"] as const
export type PricingType = (typeof PRICING_TYPES)[number]
export type PaymentStrategy = (typeof PAYMENT_STRATEGIES)[number]

export type ServiceOffer = Readonly<{
  id: string
  garageId: string
  serviceKey: string
  code: string
  name: string
  slug: string
  shortDescription: string | null
  description: string | null
  isActive: boolean
  isPublic: boolean
  displayOrder: number
  durationMinutes: number | null
  pricingType: PricingType
  amountCents: number | null
  currency: string
  paymentStrategy: PaymentStrategy
  depositAmountCents: number | null
}>

export type ServiceOfferOption = Readonly<{ id: string; offerId: string; name: string; isActive: boolean; isPublic: boolean; amountCents: number | null; durationDeltaMinutes: number; displayOrder: number }>
export type PaymentSummary = Readonly<{ paymentStrategy: PaymentStrategy; amountDueNow: number | null; totalAmount: number | null; remainingAmount: number | null; currency: string }>
export type ServiceFinancialSnapshot = Readonly<{ offerId: string; offerName: string; pricingType: PricingType; baseAmountCents: number | null; options: readonly Readonly<{ id: string; name: string; amountCents: number | null }>[]; totalAmountCents: number | null; paymentStrategy: PaymentStrategy; amountDueNowCents: number | null; currency: string }>

import type { PaymentSummary, ServiceFinancialSnapshot, ServiceOffer, ServiceOfferOption } from "../types/service-catalog"

export class ServicePricingEngine {
  calculate(offer: ServiceOffer, availableOptions: readonly ServiceOfferOption[], selectedOptionIds: readonly string[]) {
    const selected = selectedOptionIds.map(id => availableOptions.find(option => option.id === id && option.offerId === offer.id && option.isActive)).filter((option): option is ServiceOfferOption => Boolean(option))
    if (selected.length !== new Set(selectedOptionIds).size) throw new Error("OPTION_NOT_AVAILABLE")
    const totalAmount = offer.amountCents === null ? null : offer.amountCents + selected.reduce((total, option) => total + (option.amountCents ?? 0), 0)
    return { selected, totalAmount }
  }
}

export class ServicePaymentRuleEngine {
  resolve(offer: ServiceOffer, totalAmount: number | null): PaymentSummary {
    if (offer.paymentStrategy === "FULL_PAYMENT") return { paymentStrategy: offer.paymentStrategy, amountDueNow: totalAmount, totalAmount, remainingAmount: totalAmount === null ? null : 0, currency: offer.currency }
    if (offer.paymentStrategy === "DEPOSIT") return { paymentStrategy: offer.paymentStrategy, amountDueNow: offer.depositAmountCents, totalAmount, remainingAmount: totalAmount === null || offer.depositAmountCents === null ? null : Math.max(0, totalAmount - offer.depositAmountCents), currency: offer.currency }
    return { paymentStrategy: offer.paymentStrategy, amountDueNow: 0, totalAmount, remainingAmount: totalAmount, currency: offer.currency }
  }
}

export function buildFinancialSnapshot(offer: ServiceOffer, options: readonly ServiceOfferOption[], summary: PaymentSummary): ServiceFinancialSnapshot {
  return { offerId: offer.id, offerName: offer.name, pricingType: offer.pricingType, baseAmountCents: offer.amountCents, options: options.map(option => ({ id: option.id, name: option.name, amountCents: option.amountCents })), totalAmountCents: summary.totalAmount, paymentStrategy: summary.paymentStrategy, amountDueNowCents: summary.amountDueNow, currency: summary.currency }
}

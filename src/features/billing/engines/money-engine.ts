import type { BillingLineInput } from "../types/billing"

export type LineTotals = Readonly<{
  lineTotalExclVatCents: number
  vatAmountCents: number
  lineTotalInclVatCents: number
}>

export type DocumentTotals = Readonly<{
  subtotalExclVatCents: number
  totalVatCents: number
  totalInclVatCents: number
  vatByRate: Readonly<Record<number, number>>
}>

/** Deterministic line totals using integer centimes and basis points. Mirrors SQL billing_line_totals. */
export function computeLineTotals(
  quantity: number,
  unitPriceExclVatCents: number,
  vatRateBps: number,
  discountBps = 0,
): LineTotals {
  if (quantity <= 0 || unitPriceExclVatCents < 0 || vatRateBps < 0 || discountBps < 0) {
    throw new Error("INVALID_LINE_INPUT")
  }
  const grossExcl = quantity * unitPriceExclVatCents
  const lineTotalExclVatCents = Math.round(grossExcl * (1 - discountBps / 10_000))
  const vatAmountCents = Math.round(lineTotalExclVatCents * vatRateBps / 10_000)
  return {
    lineTotalExclVatCents,
    vatAmountCents,
    lineTotalInclVatCents: lineTotalExclVatCents + vatAmountCents,
  }
}

export function computeDocumentTotals(
  lines: readonly Pick<
    BillingLineInput,
    "quantity" | "unitPriceExclVatCents" | "vatRateBps" | "discountBps"
  >[],
): DocumentTotals {
  const vatByRate: Record<number, number> = {}
  let subtotalExclVatCents = 0
  let totalVatCents = 0

  for (const line of lines) {
    const totals = computeLineTotals(
      line.quantity,
      line.unitPriceExclVatCents,
      line.vatRateBps,
      line.discountBps ?? 0,
    )
    subtotalExclVatCents += totals.lineTotalExclVatCents
    totalVatCents += totals.vatAmountCents
    vatByRate[line.vatRateBps] = (vatByRate[line.vatRateBps] ?? 0) + totals.vatAmountCents
  }

  return {
    subtotalExclVatCents,
    totalVatCents,
    totalInclVatCents: subtotalExclVatCents + totalVatCents,
    vatByRate,
  }
}

export function computeRemainingCents(
  totalInclVatCents: number,
  amountPaidCents: number,
  amountCreditedCents: number,
): number {
  return Math.max(0, totalInclVatCents - amountPaidCents - amountCreditedCents)
}

export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100)
}

export function formatVatRate(vatRateBps: number): string {
  return `${(vatRateBps / 100).toFixed(vatRateBps % 100 === 0 ? 0 : 2)} %`
}

export function parseEurosToCents(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".")
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

export function isDocumentEditable(status: string): boolean {
  return status === "DRAFT"
}

export function isDocumentImmutable(status: string): boolean {
  return status !== "DRAFT"
}

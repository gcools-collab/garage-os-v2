import type { CanonicalStructuredInvoice } from "../../types/e-invoicing"

export type B2brouterInvoicePayload = Readonly<{
  invoice: Readonly<{
    number: string
    date: string
    due_date: string | null
    currency: string
    contact: Readonly<{
      name: string
      taxcode: string | null
      tin_scheme: string | null
      tin_value: string | null
      email: string | null
      phone: string | null
      address: string | null
      postalcode: string | null
      city: string | null
      country: string
    }>
    invoice_lines_attributes: readonly Readonly<{
      position: number
      description: string
      quantity: number
      unit: number
      price: number
      taxes_attributes: readonly Readonly<{
        name: string
        percent: number
      }>[]
    }>[]
    taxes_attributes: readonly Readonly<{
      name: string
      percent: number
      base: number
      amount: number
    }>[]
  }>
  send_after_import?: boolean
}>

function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100
}

function vatPercent(vatRateBps: number): number {
  return Math.round(vatRateBps / 100) / 100
}

export function mapCanonicalInvoiceToB2brouterPayload(
  canonical: CanonicalStructuredInvoice,
  options: { readonly sendAfterImport: boolean },
): B2brouterInvoicePayload {
  const vatGroups = new Map<number, { base: number; amount: number }>()
  for (const line of canonical.lines) {
    const existing = vatGroups.get(line.vatRateBps) ?? { base: 0, amount: 0 }
    vatGroups.set(line.vatRateBps, {
      base: existing.base + line.lineTotalExclVatCents,
      amount: existing.amount + line.vatAmountCents,
    })
  }

  return {
    invoice: {
      number: canonical.documentNumber,
      date: canonical.issueDate,
      due_date: canonical.dueDate,
      currency: canonical.currency,
      contact: {
        name: canonical.buyer.companyName ?? canonical.buyer.name,
        taxcode: canonical.buyer.vatNumber,
        tin_scheme: canonical.buyer.siren ? "0002" : null,
        tin_value: canonical.buyer.siren,
        email: canonical.buyer.email,
        phone: canonical.buyer.phone,
        address: canonical.buyer.addressLine1,
        postalcode: canonical.buyer.postalCode,
        city: canonical.buyer.city,
        country: canonical.buyer.countryCode,
      },
      invoice_lines_attributes: canonical.lines.map((line) => ({
        position: line.lineOrder + 1,
        description: line.description,
        quantity: line.quantity,
        unit: 1,
        price: centsToDecimal(line.unitPriceExclVatCents),
        taxes_attributes: [{
          name: `TVA ${vatPercent(line.vatRateBps)}%`,
          percent: vatPercent(line.vatRateBps),
        }],
      })),
      taxes_attributes: [...vatGroups.entries()].map(([bps, totals]) => ({
        name: `TVA ${vatPercent(bps)}%`,
        percent: vatPercent(bps),
        base: centsToDecimal(totals.base),
        amount: centsToDecimal(totals.amount),
      })),
    },
    send_after_import: options.sendAfterImport,
  }
}

export function mapB2brouterStatus(raw: string | null | undefined): "SUBMITTED" | "ACCEPTED" | "REJECTED" | "ERROR" {
  const normalized = (raw ?? "").toLowerCase()
  if (normalized.includes("accept") || normalized.includes("paid") || normalized.includes("delivered")) return "ACCEPTED"
  if (normalized.includes("reject") || normalized.includes("error") || normalized.includes("fail")) return "REJECTED"
  if (normalized.includes("sent") || normalized.includes("submitted") || normalized.includes("issued")) return "SUBMITTED"
  return "ERROR"
}

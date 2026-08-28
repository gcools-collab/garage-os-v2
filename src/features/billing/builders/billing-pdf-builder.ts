import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import { formatMoney, formatVatRate } from "../engines/money-engine"
import { documentTypeLabels } from "../builders/billing-view-models"
import type { BillingDocumentBundle } from "../types/billing"

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN = 48

export async function buildBillingPdf(bundle: BillingDocumentBundle): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const { document: doc, lines } = bundle
  const issuer = doc.issuer_snapshot ?? {}
  const customer = doc.customer_snapshot ?? {}

  let y = PAGE_HEIGHT - MARGIN

  const draw = (text: string, size = 10, bold = false, color = rgb(0.1, 0.1, 0.1)) => {
    page.drawText(text, { x: MARGIN, y, size, font: bold ? fontBold : font, color })
    y -= size + 6
  }

  draw("Garage OS", 9, false, rgb(0.4, 0.4, 0.4))
  draw(documentTypeLabels[doc.document_type].toUpperCase(), 18, true)
  draw(doc.document_number ?? "Brouillon", 12, true)
  y -= 8

  draw(issuer.legalName ?? issuer.displayName ?? "Garage", 11, true)
  const issuerLines = [
    [issuer.addressLine1, issuer.addressLine2].filter(Boolean).join(", "),
    [issuer.postalCode, issuer.city].filter(Boolean).join(" "),
    issuer.siret ? `SIRET : ${issuer.siret}` : null,
    issuer.vatNumber ? `TVA : ${issuer.vatNumber}` : null,
    issuer.email,
    issuer.phone,
  ].filter(Boolean) as string[]
  for (const line of issuerLines) draw(line, 9)

  y -= 12
  draw("Client", 10, true)
  draw(customer.name ?? "Client", 10)
  const customerLines = [
    customer.addressLine,
    [customer.postalCode, customer.city].filter(Boolean).join(" "),
    customer.email,
    customer.phone,
  ].filter(Boolean) as string[]
  for (const line of customerLines) draw(String(line), 9)

  if (doc.issue_date) {
    y -= 8
    draw(`Date : ${new Date(doc.issue_date).toLocaleDateString("fr-FR")}`, 9)
  }
  if (doc.valid_until) {
    draw(`Validité : ${new Date(doc.valid_until).toLocaleDateString("fr-FR")}`, 9)
  }

  y -= 16
  draw("Désignation", 9, true)
  page.drawText("Qté", { x: 300, y: y + 15, size: 9, font: fontBold })
  page.drawText("PU HT", { x: 340, y: y + 15, size: 9, font: fontBold })
  page.drawText("TVA", { x: 400, y: y + 15, size: 9, font: fontBold })
  page.drawText("Total TTC", { x: 470, y: y + 15, size: 9, font: fontBold })

  for (const line of lines) {
    if (y < 120) break
    draw(line.description.slice(0, 60), 9)
    const rowY = y + 15
    page.drawText(String(line.quantity), { x: 300, y: rowY, size: 9, font })
    page.drawText(formatMoney(line.unit_price_excl_vat_cents, doc.currency), { x: 340, y: rowY, size: 9, font })
    page.drawText(formatVatRate(line.vat_rate_bps), { x: 400, y: rowY, size: 9, font })
    page.drawText(formatMoney(line.line_total_incl_vat_cents, doc.currency), { x: 470, y: rowY, size: 9, font })
  }

  y -= 8
  draw(`Total HT : ${formatMoney(doc.subtotal_excl_vat_cents, doc.currency)}`, 10)
  draw(`TVA : ${formatMoney(doc.total_vat_cents, doc.currency)}`, 10)
  draw(`Total TTC : ${formatMoney(doc.total_incl_vat_cents, doc.currency)}`, 11, true)

  if (doc.document_type === "INVOICE") {
    draw(`Payé : ${formatMoney(doc.amount_paid_cents, doc.currency)}`, 10)
    if (doc.amount_credited_cents > 0) {
      draw(`Avoirs : ${formatMoney(doc.amount_credited_cents, doc.currency)}`, 10)
    }
  }

  if (issuer.invoiceFooterText) {
    y = 72
    draw(issuer.invoiceFooterText.slice(0, 200), 8, false, rgb(0.35, 0.35, 0.35))
  }

  return pdf.save()
}

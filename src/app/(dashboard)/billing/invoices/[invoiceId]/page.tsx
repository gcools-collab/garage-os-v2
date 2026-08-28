import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  BillingDocumentDetail,
  buildBillingDetailViewModel,
  buildElectronicInvoiceSectionViewModel,
  ElectronicInvoiceSection,
  formatMoney,
  getBillingDocumentBundle,
  getGarageElectronicInvoiceSettings,
  getGarageFiscalSettings,
} from "@/features/billing"
import { createClient } from "@/lib/supabase/server"
import { getActiveGarageSession } from "@/features/tenant"

type PageProps = { params: Promise<{ invoiceId: string }> }

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const { invoiceId } = await params
  const bundle = await getBillingDocumentBundle(session, invoiceId)
  if (!bundle || bundle.document.document_type !== "INVOICE") notFound()

  const [serviceOffers, eInvoiceSettings, fiscalSettings] = await Promise.all([
    loadServiceOffers(session.garageId),
    getGarageElectronicInvoiceSettings(session.garageId),
    getGarageFiscalSettings(session.garageId),
  ])
  const viewModel = buildBillingDetailViewModel(bundle)
  const transactionNature = bundle.document.transaction_nature
    ?? fiscalSettings?.default_transaction_nature
    ?? "SERVICES"
  const electronicViewModel = buildElectronicInvoiceSectionViewModel({
    bundle,
    settings: eInvoiceSettings,
    transactionNature,
  })

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <Link href="/billing/invoices" className="text-sm underline">Retour aux factures</Link>
      <BillingDocumentDetail viewModel={viewModel} serviceOffers={serviceOffers} />
      {viewModel.statusLabel !== "Brouillon" ? (
        <>
          <ElectronicInvoiceSection invoiceId={invoiceId} viewModel={electronicViewModel} />
          <Link href={`/billing/invoices/new/credit-note?invoiceId=${invoiceId}`} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">
            Créer un avoir
          </Link>
        </>
      ) : null}
    </main>
  )
}

async function loadServiceOffers(garageId: string) {
  const { data } = await (await createClient())
    .from("service_offers")
    .select("id, name, amount_cents, currency")
    .eq("garage_id", garageId)
    .eq("is_active", true)
    .not("amount_cents", "is", null)

  return (data ?? []).map((offer) => ({
    id: offer.id,
    name: offer.name,
    amountLabel: formatMoney(offer.amount_cents ?? 0, offer.currency ?? "EUR"),
  }))
}

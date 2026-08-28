import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import {
  BillingDocumentDetail,
  buildBillingDetailViewModel,
  formatMoney,
  getBillingDocumentBundle,
} from "@/features/billing"
import { createClient } from "@/lib/supabase/server"
import { getActiveGarageSession } from "@/features/tenant"

type PageProps = { params: Promise<{ creditNoteId: string }> }

export default async function CreditNoteDetailPage({ params }: PageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const { creditNoteId } = await params
  const bundle = await getBillingDocumentBundle(session, creditNoteId)
  if (!bundle || bundle.document.document_type !== "CREDIT_NOTE") notFound()

  const serviceOffers = await loadServiceOffers(session.garageId)
  const viewModel = buildBillingDetailViewModel(bundle)

  return (
    <main className="mx-auto max-w-5xl space-y-6">
      <Link href="/billing/credit-notes" className="text-sm underline">Retour aux avoirs</Link>
      <BillingDocumentDetail viewModel={viewModel} serviceOffers={serviceOffers} />
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

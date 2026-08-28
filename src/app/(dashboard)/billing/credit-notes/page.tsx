import { redirect } from "next/navigation"
import { BillingDocumentList, buildBillingListItem, listBillingDocuments } from "@/features/billing"
import { getActiveGarageSession } from "@/features/tenant"

export default async function CreditNotesPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const documents = await listBillingDocuments(session, "CREDIT_NOTE")
  const items = documents.map((doc) => buildBillingListItem(doc))

  return (
    <main>
      <BillingDocumentList
        title="Avoirs"
        description="Émettez des avoirs liés à une facture sans la modifier."
        createHref="/billing/invoices"
        createLabel="Depuis une facture"
        items={items}
      />
    </main>
  )
}

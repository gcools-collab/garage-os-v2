import { redirect } from "next/navigation"
import { BillingDocumentList, buildBillingListItem, listBillingDocuments } from "@/features/billing"
import { getActiveGarageSession } from "@/features/tenant"

export default async function InvoicesPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const documents = await listBillingDocuments(session, "INVOICE")
  const items = documents.map((doc) => buildBillingListItem(doc))

  return (
    <main>
      <BillingDocumentList
        title="Factures"
        description="Suivez l&apos;émission, les paiements et les soldes clients."
        createHref="/customers"
        createLabel="Créer via un client"
        items={items}
      />
    </main>
  )
}

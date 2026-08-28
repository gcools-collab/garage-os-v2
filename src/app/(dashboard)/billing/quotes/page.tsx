import { redirect } from "next/navigation"
import { BillingDocumentList, buildBillingListItem, listBillingDocuments } from "@/features/billing"
import { getActiveGarageSession } from "@/features/tenant"

export default async function QuotesPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const documents = await listBillingDocuments(session, "QUOTE")
  const items = documents.map((doc) => buildBillingListItem(doc))

  return (
    <main>
      <BillingDocumentList
        title="Devis"
        description="Créez, envoyez et convertissez vos devis."
        createHref="/customers"
        createLabel="Créer via un client"
        items={items}
      />
    </main>
  )
}

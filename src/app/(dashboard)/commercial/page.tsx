import { redirect } from "next/navigation"
import {
  buildCommercialInbox,
  CommercialInbox,
  getCommercialInboxData,
} from "@/features/commercial"
import { getActiveGarageSession } from "@/features/tenant"

export default async function CommercialPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const data = await getCommercialInboxData(session)
  return <CommercialInbox inbox={buildCommercialInbox(data)} />
}

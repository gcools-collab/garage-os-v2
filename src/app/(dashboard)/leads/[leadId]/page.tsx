import { notFound, redirect } from "next/navigation"
import { buildLeadDetail, getGarageLeadDetail, LeadDetail } from "@/features/leads"
import { getActiveGarageSession } from "@/features/tenant"
import {
  buildCommercialLeadWorkspace,
  CommercialLeadWorkspace,
  getCommercialLeadContext,
  type CommercialLeadRecord,
} from "@/features/commercial"

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const { leadId } = await params
  const [result, commercialContext] = await Promise.all([
    getGarageLeadDetail(session, leadId),
    getCommercialLeadContext(session, leadId),
  ])
  if (!result) notFound()
  const lead = buildLeadDetail(result.lead, result.events)
  const workspace = buildCommercialLeadWorkspace({
    lead: result.lead as CommercialLeadRecord,
    context: commercialContext,
    currentUserId: session.userId,
  })
  return <div className="mx-auto max-w-6xl space-y-6"><header><h1 className="text-3xl font-semibold tracking-tight">{lead.customerName}</h1><p className="mt-2 text-muted-foreground">{lead.typeLabel}</p></header><LeadDetail lead={lead} /><CommercialLeadWorkspace workspace={workspace} /></div>
}

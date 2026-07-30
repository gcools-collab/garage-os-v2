import { notFound, redirect } from "next/navigation"
import { buildLeadDetail, getGarageLeadDetail, LeadDetail } from "@/features/leads"
import { getActiveGarageSession } from "@/features/tenant"

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const { leadId } = await params
  const result = await getGarageLeadDetail(session, leadId)
  if (!result) notFound()
  const lead = buildLeadDetail(result.lead, result.events)
  return <div className="mx-auto max-w-6xl space-y-6"><header><h1 className="text-3xl font-semibold tracking-tight">{lead.customerName}</h1><p className="mt-2 text-muted-foreground">{lead.typeLabel}</p></header><LeadDetail lead={lead} /></div>
}

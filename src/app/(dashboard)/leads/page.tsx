import Link from "next/link"
import { redirect } from "next/navigation"

import { LeadList, buildLeadListItems, getGarageLeads, LEAD_STATUSES, LEAD_TYPES, leadStatusLabels, leadTypeLabels, type LeadStatus, type LeadType } from "@/features/leads"
import { getActiveGarageSession } from "@/features/tenant"

type LeadsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const params = await searchParams
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value
  const rawStatus = first(params.status)
  const rawType = first(params.type)
  const query = {
    q: first(params.q)?.trim().slice(0, 100) || undefined,
    status: LEAD_STATUSES.includes(rawStatus as LeadStatus) ? rawStatus as LeadStatus : undefined,
    type: LEAD_TYPES.includes(rawType as LeadType) ? rawType as LeadType : undefined,
    page: Math.max(1, Number(first(params.page)) || 1),
  }
  const page = await getGarageLeads(session, query)
  const pageCount = Math.max(1, Math.ceil(page.total / page.pageSize))
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header><h1 className="text-3xl font-semibold tracking-tight">Leads</h1><p className="mt-2 text-muted-foreground">{page.total} demande(s) commerciale(s).</p></header>
      <form className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-[1fr_12rem_14rem_auto]">
        <input name="q" defaultValue={query.q} placeholder="Nom, contact ou véhicule" className="min-h-10 rounded-md border px-3" />
        <select name="status" defaultValue={query.status ?? ""} className="min-h-10 rounded-md border px-3"><option value="">Tous les statuts</option>{LEAD_STATUSES.map((status) => <option key={status} value={status}>{leadStatusLabels[status]}</option>)}</select>
        <select name="type" defaultValue={query.type ?? ""} className="min-h-10 rounded-md border px-3"><option value="">Tous les types</option>{LEAD_TYPES.map((type) => <option key={type} value={type}>{leadTypeLabels[type]}</option>)}</select>
        <button className="rounded-md bg-primary px-4 text-primary-foreground">Filtrer</button>
      </form>
      <LeadList leads={buildLeadListItems(page.leads)} />
      {pageCount > 1 ? <nav className="flex justify-between text-sm">{page.page > 1 ? <Link href={`/leads?page=${page.page - 1}`}>Précédent</Link> : <span />}{page.page < pageCount ? <Link href={`/leads?page=${page.page + 1}`}>Suivant</Link> : null}</nav> : null}
    </div>
  )
}

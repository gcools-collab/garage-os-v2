import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import type { LeadListItemViewModel } from "../types"

export function LeadList({ leads }: { readonly leads: readonly LeadListItemViewModel[] }) {
  if (leads.length === 0) {
    return <div className="rounded-xl border bg-white p-10 text-center text-muted-foreground">Aucun lead ne correspond à ces critères.</div>
  }
  return (
    <div className="grid gap-3">
      {leads.map((lead) => (
        <article key={lead.id} className="grid gap-4 rounded-xl border bg-white p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
          <div className="flex flex-wrap gap-2">
            <Badge variant={lead.status === "NEW" ? "default" : "secondary"}>{lead.statusLabel}</Badge>
            <Badge variant="outline">{lead.priorityLabel}</Badge>
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold">{lead.customerName}</h2>
            <p className="truncate text-sm text-muted-foreground">{lead.typeLabel} · {lead.vehicleTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{lead.createdAtLabel} · {lead.contactLabel}</p>
          </div>
          <Link href={lead.href} className="text-sm font-semibold underline underline-offset-4">Ouvrir</Link>
        </article>
      ))}
    </div>
  )
}

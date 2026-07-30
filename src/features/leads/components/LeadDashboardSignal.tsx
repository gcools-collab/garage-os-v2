import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LeadDashboardSummaryViewModel } from "../types"

export function LeadDashboardSignal({ summary }: { readonly summary: LeadDashboardSummaryViewModel }) {
  if (!summary.message) return null
  return (
    <Card>
      <CardHeader><CardTitle>Prospects à traiter</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-semibold">{summary.message}</p><p className="text-sm text-muted-foreground">{summary.appointmentRequestCount} demande(s) de rendez-vous ou d’essai.</p></div>
        <Link href="/leads" className="text-sm font-semibold underline underline-offset-4">Voir les leads</Link>
      </CardContent>
    </Card>
  )
}

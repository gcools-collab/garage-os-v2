import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LeadDashboardSummaryViewModel } from "../types"

export function LeadDashboardSignal({ summary }: { readonly summary: LeadDashboardSummaryViewModel }) {
  return <Card><CardHeader><CardTitle>Demandes clients</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-4"><p><strong>{summary.newTodayCount}</strong><br/><span className="text-sm text-muted-foreground">aujourd’hui</span></p><p><strong>{summary.testDriveCount}</strong><br/><span className="text-sm text-muted-foreground">essais à organiser</span></p><p><strong>{summary.tradeInCount}</strong><br/><span className="text-sm text-muted-foreground">reprises à qualifier</span></p><p><strong>{summary.serviceRequestCount}</strong><br/><span className="text-sm text-muted-foreground">services à traiter</span></p></div>{summary.message ? <p>{summary.message}</p> : <p className="text-muted-foreground">Aucune demande en attente.</p>}<Link href="/leads" className="text-sm font-semibold underline underline-offset-4">Voir les demandes</Link></CardContent></Card>
}

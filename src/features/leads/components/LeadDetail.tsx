import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { updateLeadStatus } from "../actions"
import type { LeadDetailViewModel } from "../types"

export function LeadDetail({ lead }: { readonly lead: LeadDetailViewModel }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Demande</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2"><Badge>{lead.statusLabel}</Badge><Badge variant="outline">{lead.typeLabel}</Badge></div>
            <p>{lead.message ?? "Aucun commentaire."}</p>
            {lead.preferredSlotLabel ? <p><strong>Créneau souhaité :</strong> {lead.preferredSlotLabel}</p> : null}
            <p className="text-sm text-muted-foreground">{lead.sourceLabel} · {lead.createdAtLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Véhicule</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold">{lead.vehicleTitle}</p>
            {lead.priceLabel ? <p>{lead.priceLabel}</p> : null}
            <div className="flex flex-wrap gap-4 text-sm">
              {lead.stockHref ? <Link href={lead.stockHref} className="underline underline-offset-4">Voir dans le stock</Link> : null}
              {lead.publicHref ? <Link href={lead.publicHref} className="underline underline-offset-4">Voir la fiche publique</Link> : null}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Historique</CardTitle></CardHeader>
          <CardContent>
            {lead.events.length ? (
              <ol className="space-y-3">{lead.events.map((event) => <li key={event.id}><span className="font-medium">{event.label}</span><br /><span className="text-sm text-muted-foreground">{event.dateLabel}</span></li>)}</ol>
            ) : <p className="text-muted-foreground">Aucun événement.</p>}
          </CardContent>
        </Card>
      </div>
      <aside className="space-y-6">
        <Card>
          <CardHeader><CardTitle>{lead.customerName}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {lead.phoneHref ? <a href={lead.phoneHref} className="block underline underline-offset-4">{lead.phone}</a> : null}
            {lead.emailHref ? <a href={lead.emailHref} className="block break-all underline underline-offset-4">{lead.email}</a> : null}
            <p className="text-xs text-muted-foreground">{lead.consentContactLabel}<br />{lead.consentMarketingLabel}</p>
          </CardContent>
        </Card>
        {lead.availableStatuses.length ? (
          <Card>
            <CardHeader><CardTitle>Traitement</CardTitle></CardHeader>
            <CardContent>
              <form action={updateLeadStatus} className="grid gap-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="grid gap-2 text-sm font-medium">
                  Nouveau statut
                  <select name="nextStatus" className="min-h-10 rounded-md border bg-background px-3">
                    {lead.availableStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                  </select>
                </label>
                <Button type="submit">Mettre à jour</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  )
}

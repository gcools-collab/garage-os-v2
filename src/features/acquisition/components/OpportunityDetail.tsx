import Link from "next/link"
import { ArrowLeft, FileText, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  changeAcquisitionStatus,
  deleteAcquisitionDocument,
  deleteAcquisitionOpportunity,
  uploadAcquisitionDocument,
} from "../actions/opportunity-actions"
import type { AcquisitionDetailViewModel } from "../presentation/opportunity-view-model"

export function OpportunityDetail({ detail }: { readonly detail: AcquisitionDetailViewModel }) {
  return <div className="space-y-6">
    <Button variant="ghost" asChild><Link href="/acquisition"><ArrowLeft />Retour aux opportunités</Link></Button>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-sm text-muted-foreground">Opportunité d’acquisition</p><h1 className="text-3xl font-bold">{detail.vehicleTitle}</h1></div>
      <Badge variant="secondary">{detail.status}</Badge>
    </div>
    {detail.allowedTransitions.length ? <Card><CardHeader><CardTitle>Cycle de vie</CardTitle><CardDescription>Le changement est manuel et contrôlé côté serveur.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{detail.allowedTransitions.map((transition) => (
      <form key={transition.value} action={changeAcquisitionStatus}><input type="hidden" name="opportunityId" value={detail.id} /><input type="hidden" name="status" value={transition.value} /><Button type="submit" variant="outline">{transition.label}</Button></form>
    ))}</CardContent></Card> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      <InfoCard title="Vendeur" rows={[["Type", detail.seller.type], ["Nom", detail.seller.name], ["Contact", detail.seller.contact], ["Ville", detail.seller.city]]} />
      <InfoCard title="Acquisition" rows={[["Prix demandé", detail.acquisition.askingPrice], ["Travaux estimés", detail.acquisition.repairEstimate], ["Provenance", detail.acquisition.provenance], ["Confiance", detail.acquisition.confidence], ["Créée le", detail.acquisition.createdAt]]} />
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Véhicule</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{detail.vehicle.map((row) => <div key={row.label}><p className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</p><p className="mt-1 text-sm font-medium">{row.value}</p></div>)}</CardContent></Card>
      <Card className="lg:col-span-2"><CardHeader><CardTitle>Commentaires</CardTitle></CardHeader><CardContent className="whitespace-pre-wrap text-sm">{detail.comments}</CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Documents et photos</CardTitle><CardDescription>PDF ou image, 10 Mo maximum.</CardDescription></CardHeader><CardContent className="space-y-4">
      <form action={uploadAcquisitionDocument} className="grid gap-3 md:grid-cols-[1fr_180px_1fr_auto]">
        <input type="hidden" name="opportunityId" value={detail.id} />
        <input name="label" placeholder="Libellé" className="h-9 rounded-md border bg-background px-3 text-sm" required />
        <select name="category" className="h-9 rounded-md border bg-background px-3 text-sm"><option value="PHOTO">Photo</option><option value="REGISTRATION_CERTIFICATE">Carte grise</option><option value="TECHNICAL_INSPECTION">Contrôle technique</option><option value="SERVICE_BOOK">Carnet</option><option value="INVOICE">Facture</option><option value="OTHER">Autre</option></select>
        <input name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="text-sm" />
        <Button type="submit">Ajouter</Button>
      </form>
      {detail.documents.length ? <div className="divide-y">{detail.documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 py-3"><div className="flex items-center gap-3"><FileText className="size-4 text-muted-foreground" /><div><p className="text-sm font-medium">{document.label}</p><p className="text-xs text-muted-foreground">{document.categoryLabel} · {document.filename} · {document.createdAt}</p></div></div><form action={deleteAcquisitionDocument}><input type="hidden" name="documentId" value={document.id} /><input type="hidden" name="opportunityId" value={detail.id} /><Button size="icon-sm" variant="ghost" aria-label={`Supprimer ${document.label}`}><Trash2 /></Button></form></div>)}</div> : <p className="text-sm text-muted-foreground">Aucun document enregistré.</p>}
    </CardContent></Card>
    <form action={deleteAcquisitionOpportunity} className="flex justify-end"><input type="hidden" name="opportunityId" value={detail.id} /><Button type="submit" variant="destructive"><Trash2 />Supprimer l’opportunité</Button></form>
  </div>
}

function InfoCard({ title, rows }: { readonly title: string; readonly rows: readonly (readonly [string, string])[] }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="space-y-3">{rows.map(([label, value]) => <div key={label} className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>)}</CardContent></Card>
}

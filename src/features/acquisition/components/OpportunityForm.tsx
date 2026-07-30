"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { AcquisitionOpportunity } from "../types/opportunity"
import type { AcquisitionActionState } from "../types/opportunity"

const INITIAL_STATE: AcquisitionActionState = { success: false }
const fieldClass = "space-y-1.5"
const labelClass = "text-sm font-medium"
const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm"
const textareaClass = "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"

export function OpportunityForm({
  action,
  opportunity,
}: {
  readonly action: (state: AcquisitionActionState, data: FormData) => Promise<AcquisitionActionState>
  readonly opportunity?: AcquisitionOpportunity
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  const router = useRouter()
  useEffect(() => {
    if (state.success && state.opportunityId && !opportunity) {
      router.push(`/acquisition/${state.opportunityId}`)
    }
  }, [opportunity, router, state])
  const seller = opportunity?.seller
  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Vendeur</CardTitle><CardDescription>Coordonnées privées du contact.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Type"><select name="sellerType" defaultValue={seller?.type ?? "PRIVATE"} className={selectClass}><option value="PRIVATE">Particulier</option><option value="PROFESSIONAL">Professionnel</option></select></Field>
          <Field label="Nom"><Input name="sellerName" defaultValue={seller?.name ?? ""} required /></Field>
          <Field label="Téléphone"><Input name="sellerPhone" defaultValue={seller?.phone ?? ""} /></Field>
          <Field label="Email"><Input name="sellerEmail" type="email" defaultValue={seller?.email ?? ""} /></Field>
          <Field label="Ville"><Input name="sellerCity" defaultValue={seller?.city ?? ""} /></Field>
          <Field label="Commentaires internes"><Input name="sellerComments" defaultValue={seller?.internalComments ?? ""} /></Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Véhicule proposé</CardTitle><CardDescription>Informations connues avant toute décision d’achat.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Marque"><Input name="brand" defaultValue={opportunity?.brand ?? ""} required /></Field>
          <Field label="Modèle"><Input name="model" defaultValue={opportunity?.model ?? ""} required /></Field>
          <Field label="Finition"><Input name="trim" defaultValue={opportunity?.trim ?? ""} /></Field>
          <Field label="Année"><Input name="year" type="number" min="1900" defaultValue={opportunity?.year ?? ""} /></Field>
          <Field label="Kilométrage"><Input name="mileage" type="number" min="0" defaultValue={opportunity?.mileage ?? ""} /></Field>
          <Field label="Énergie"><Input name="fuel" defaultValue={opportunity?.fuel ?? ""} /></Field>
          <Field label="Boîte"><Input name="gearbox" defaultValue={opportunity?.gearbox ?? ""} /></Field>
          <Field label="Couleur"><Input name="color" defaultValue={opportunity?.color ?? ""} /></Field>
          <Field label="État général"><select name="generalCondition" defaultValue={opportunity?.generalCondition ?? "UNKNOWN"} className={selectClass}><option value="UNKNOWN">Non évalué</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Bon</option><option value="FAIR">Moyen</option><option value="POOR">À reprendre</option></select></Field>
          <Field label="Immatriculation"><Input name="registration" defaultValue={opportunity?.registration ?? ""} /></Field>
          <Field label="VIN"><Input name="vin" maxLength={17} defaultValue={opportunity?.vin ?? ""} /></Field>
          <Field label="Options (séparées par des virgules)"><Input name="options" defaultValue={opportunity?.options.join(", ") ?? ""} /></Field>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Contexte d’acquisition</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Provenance"><select name="provenance" defaultValue={opportunity?.provenance ?? "OTHER"} className={selectClass}>{PROVENANCES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Niveau de confiance"><select name="confidenceLevel" defaultValue={opportunity?.confidenceLevel ?? "MEDIUM"} className={selectClass}><option value="LOW">Faible</option><option value="MEDIUM">Moyen</option><option value="HIGH">Élevé</option></select></Field>
          <Field label="Prix demandé"><Input name="askingPrice" type="number" min="0" step="0.01" defaultValue={opportunity?.askingPrice ?? ""} /></Field>
          <Field label="Estimation des travaux"><Input name="repairEstimate" type="number" min="0" step="0.01" defaultValue={opportunity?.repairEstimate ?? ""} /></Field>
          <Field label="URL source"><Input name="sourceUrl" type="url" defaultValue={opportunity?.sourceUrl ?? ""} /></Field>
          <Field label="Commentaires"><textarea name="comments" defaultValue={opportunity?.comments ?? ""} className={textareaClass} /></Field>
        </CardContent>
      </Card>
      {state.message ? <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p> : null}
      {state.errors ? <p className="text-sm text-destructive">Certains champs sont invalides. Vérifiez le formulaire.</p> : null}
      <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? "Enregistrement…" : opportunity ? "Enregistrer les modifications" : "Créer l’opportunité"}</Button></div>
    </form>
  )
}

function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return <label className={fieldClass}><span className={labelClass}>{label}</span>{children}</label>
}

const PROVENANCES = [
  ["LEBONCOIN", "Leboncoin"], ["LA_CENTRALE", "La Centrale"], ["MARKETPLACE", "Marketplace"],
  ["CUSTOMER_TRADE_IN", "Reprise client"], ["WALK_IN", "Dépôt spontané"],
  ["PROFESSIONAL_NETWORK", "Réseau professionnel"], ["DEALER", "Marchand"],
  ["AUCTION", "Vente aux enchères"], ["REFERRER", "Apporteur"], ["OTHER", "Autre"],
] as const

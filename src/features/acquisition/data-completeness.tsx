import { CheckCircle2, CircleAlert } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { hasIdentifiedBrandAndModel } from "./acquisition-presentation"
import type { DraftVehicle } from "./types"

type CompletenessCheck = {
  label: string
  complete: boolean
  completeLabel?: string
}

export function DataCompleteness({
  draft,
  purchasePriceComplete,
}: {
  draft: DraftVehicle
  purchasePriceComplete: boolean
}) {
  const checks: CompletenessCheck[] = [
    { label: "Photos", complete: draft.photos.length > 0, completeLabel: `${draft.photos.length} disponible(s)` },
    { label: "Description", complete: Boolean(draft.description?.trim()), completeLabel: "Disponible" },
    { label: "Année", complete: draft.year !== null, completeLabel: "Disponible" },
    { label: "Kilométrage", complete: draft.mileage !== null, completeLabel: "Disponible" },
    { label: "Carburant", complete: Boolean(draft.characteristics.fuel), completeLabel: "Identifié" },
    { label: "Boîte de vitesses", complete: Boolean(draft.characteristics.gearbox), completeLabel: "Identifiée" },
    {
      label: "Marque et modèle",
      complete: hasIdentifiedBrandAndModel(draft),
      completeLabel: "Identifiés",
    },
    { label: "VIN", complete: false },
    { label: "Immatriculation", complete: false },
    { label: "Prix d'achat", complete: purchasePriceComplete, completeLabel: "Renseigné" },
  ]
  const completed = checks.filter((check) => check.complete).length
  const percentage = Math.round((completed / checks.length) * 100)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Qualité des données importées</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Complétude des informations utiles à la fiche véhicule.
            </p>
          </div>
          <span className="text-2xl font-semibold tabular-nums">{percentage} %</span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Complétude des données"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">Indicateur de complétude, sans analyse IA.</p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2 sm:grid-cols-2">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                {check.complete ? (
                  <CheckCircle2 className="size-4 text-emerald-600" />
                ) : (
                  <CircleAlert className="size-4 text-amber-600" />
                )}
                {check.label}
              </span>
              <span className={`text-xs ${check.complete ? "text-emerald-700" : "font-medium text-amber-700"}`}>
                {check.complete ? check.completeLabel : "À compléter"}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

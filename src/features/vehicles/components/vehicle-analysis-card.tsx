import { CheckCircle2, CircleAlert, Lightbulb } from "lucide-react"

type VehicleAnalysisCardProps = {
  hasPhotos: boolean
  hasVin: boolean
  hasRegistration: boolean
  hasSellingPrice: boolean
  hasCosts: boolean
}

export function VehicleAnalysisCard(props: VehicleAnalysisCardProps) {
  const rules = [
    { label: props.hasPhotos ? "Photos présentes" : "Aucune photo", complete: props.hasPhotos },
    { label: props.hasVin ? "VIN renseigné" : "VIN manquant", complete: props.hasVin },
    {
      label: props.hasRegistration
        ? "Immatriculation renseignée"
        : "Immatriculation manquante",
      complete: props.hasRegistration,
    },
    {
      label: props.hasSellingPrice
        ? "Prix de vente renseigné"
        : "Prix de vente non renseigné",
      complete: props.hasSellingPrice,
    },
    {
      label: props.hasCosts ? "Coûts enregistrés" : "Aucun coût enregistré",
      complete: props.hasCosts,
    },
  ]
  const advice = !props.hasVin
    ? "Ajoutez le VIN avant publication."
    : !props.hasRegistration
      ? "Complétez l’immatriculation pour fiabiliser la fiche."
      : !props.hasSellingPrice
        ? "Renseignez le prix de vente pour calculer la marge potentielle."
        : !props.hasPhotos
          ? "Ajoutez des photos pour préparer la diffusion."
          : "La fiche contient les informations essentielles."

  return (
    <article className="rounded-xl border bg-white p-5">
      <div className="mb-4">
        <h2 className="font-semibold">Analyse Garage OS</h2>
        <p className="mt-1 text-sm text-muted-foreground">Contrôles simples basés sur la fiche actuelle.</p>
      </div>
      <ul className="space-y-3">
        {rules.map((rule) => (
          <li key={rule.label} className="flex items-center gap-2 text-sm">
            {rule.complete ? (
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4 text-amber-600" aria-hidden="true" />
            )}
            <span>{rule.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex gap-3 rounded-lg bg-muted/60 p-3 text-sm">
        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p>{advice}</p>
      </div>
    </article>
  )
}

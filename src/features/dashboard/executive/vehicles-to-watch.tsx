import { AlertTriangle, Car, Circle } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/features/vehicles/status-badge"
import { SectionHeading } from "./executive-summary"
import type { ExecutivePriorityLevel, WatchedVehicle } from "./types"

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const levelPresentation: Record<ExecutivePriorityLevel, { label: string; className: string; dot: string }> = {
  LOW: { label: "Faible", className: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "fill-emerald-600 text-emerald-600" },
  MEDIUM: { label: "Moyenne", className: "border-orange-200 bg-orange-50 text-orange-800", dot: "fill-orange-500 text-orange-500" },
  HIGH: { label: "Élevée", className: "border-orange-300 bg-orange-50 text-orange-900", dot: "fill-orange-700 text-orange-700" },
  CRITICAL: { label: "Critique", className: "border-red-200 bg-red-50 text-red-800", dot: "fill-red-600 text-red-600" },
}

export function VehiclesToWatch({ vehicles }: { vehicles: WatchedVehicle[] }) {
  return <section aria-labelledby="watch-title" className="space-y-4">
    <SectionHeading id="watch-title" title="Véhicules à surveiller" description="Les dossiers classés selon leur urgence opérationnelle et financière." />
    <Card><CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="size-5 text-orange-600" />Priorités du parc</CardTitle></CardHeader><CardContent>
      {vehicles.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Aucun véhicule actif à surveiller.</p> : <div className="grid gap-3 lg:grid-cols-2">{vehicles.map((vehicle) => {
        const presentation = levelPresentation[vehicle.priorityLevel]
        return <Link key={vehicle.id} href={`/stock/${vehicle.id}`} className="group flex min-w-0 gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/30">
          {vehicle.primaryImageUrl ? <div role="img" aria-label={vehicle.name} className="size-20 shrink-0 rounded-lg bg-muted bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(vehicle.primaryImageUrl)})` }} /> : <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted"><Car className="size-7 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="truncate font-semibold group-hover:text-primary">{vehicle.name}</p><div className="mt-1 flex flex-wrap items-center gap-2"><StatusBadge status={vehicle.status} /><span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${presentation.className}`}><Circle className={`size-2 ${presentation.dot}`} />Priorité {presentation.label.toLowerCase()} · {vehicle.priorityScore}/100</span></div></div><p className="text-right text-sm font-semibold tabular-nums">{vehicle.potentialMargin === null ? "Marge non renseignée" : money.format(vehicle.potentialMargin)}</p></div>
            <div className="mt-3 grid gap-1 text-sm sm:grid-cols-2"><p><span className="font-medium">{vehicle.summary}</span><span className="block text-xs text-muted-foreground">{vehicle.detail}</span></p><p className="text-xs text-muted-foreground sm:text-right">{vehicle.ageDays} jour{vehicle.ageDays > 1 ? "s" : ""} en stock</p></div>
          </div>
        </Link>
      })}</div>}
    </CardContent></Card>
  </section>
}

"use client"

import { BarChart3, ExternalLink, Loader2, Search } from "lucide-react"
import { useState, useTransition } from "react"

import { analyzeVehicleMarket } from "../actions"
import type { MarketAnalysisSuccess, VehicleMarketAnalysisSnapshot } from "../state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 })
const positionLabels = { BELOW_MARKET: "Sous le marché", IN_MARKET: "Dans le marché", ABOVE_MARKET: "Au-dessus du marché" } as const

export function VehicleMarketAnalysisCard({ vehicleId, missingFields, history }: { vehicleId: string; missingFields: string[]; history: VehicleMarketAnalysisSnapshot[] }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<MarketAnalysisSuccess | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = result?.analysis ?? history[0] ?? null

  function analyze() {
    setError(null)
    startTransition(async () => {
      const response = await analyzeVehicleMarket(vehicleId)
      if (response.ok) setResult(response)
      else setError(response.message)
    })
  }

  return <Card>
    <CardHeader className="border-b">
      <div className="flex items-center gap-2"><BarChart3 className="size-5 text-primary" /><CardTitle className="text-xl font-semibold">Analyse du marché</CardTitle></div>
      <CardDescription>Comparez manuellement ce véhicule à des annonces Leboncoin similaires.</CardDescription>
      <div className="pt-3"><Button onClick={analyze} disabled={pending || missingFields.length > 0}>{pending ? <Loader2 className="animate-spin" /> : <Search />}{pending ? "Analyse en cours…" : "Analyser le marché"}</Button></div>
    </CardHeader>
    <CardContent className="space-y-5">
      {missingFields.length > 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">À compléter avant l’analyse : {missingFields.join(", ")}.</p>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {!latest && missingFields.length === 0 && <p className="text-sm text-muted-foreground">Aucune analyse enregistrée. La recherche ne sera lancée qu’en cliquant sur le bouton.</p>}
      {latest && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Comparables" value={integer.format(latest.comparableCount)} />
          <Metric label="Prix minimum" value={formatMoney(latest.minimumPrice)} />
          <Metric label="Prix médian" value={formatMoney(latest.medianPrice)} emphasized />
          <Metric label="Prix maximum" value={formatMoney(latest.maximumPrice)} />
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 sm:grid-cols-3">
          <Metric label="Prix actuel" value={formatMoney(latest.currentVehiclePrice)} />
          <Metric label="Écart à la médiane" value={latest.priceDifference == null ? "Non calculé" : `${latest.priceDifference > 0 ? "+" : ""}${money.format(latest.priceDifference)} (${latest.priceDifferencePercent! > 0 ? "+" : ""}${latest.priceDifferencePercent} %)`} />
          <div><p className="text-xs text-muted-foreground">Positionnement</p><div className="mt-1">{latest.positioning ? <Badge variant="outline">{positionLabels[latest.positioning]}</Badge> : <span className="font-medium">Non calculé</span>}</div></div>
        </div>
        <p className="text-xs text-muted-foreground">Dernière analyse : {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(latest.analyzedAt))}</p>
      </>}
      {result && result.comparables.length > 0 && <details className="rounded-lg border"><summary className="cursor-pointer p-4 font-medium">Voir {result.comparables.length} annonces comparables</summary><div className="divide-y border-t">{result.comparables.map(({ listing, score }) => <div key={`${listing.providerId}-${listing.externalId}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{listing.title}</p><p className="text-sm text-muted-foreground">{listing.year ?? "Année inconnue"} · {listing.mileage === null ? "Kilométrage inconnu" : `${integer.format(listing.mileage)} km`} · score {score}/100</p></div><div className="flex items-center gap-3"><span className="font-semibold">{money.format(listing.price)}</span>{listing.url && <Button asChild size="sm" variant="outline"><a href={listing.url} target="_blank" rel="noreferrer">Voir <ExternalLink /></a></Button>}</div></div>)}</div></details>}
      {history.length > 0 && <details className="rounded-lg border"><summary className="cursor-pointer p-4 font-medium">Historique des analyses</summary><div className="divide-y border-t">{history.slice(0, 5).map((item) => <div key={item.id} className="grid gap-1 p-3 text-sm sm:grid-cols-4"><span>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(item.analyzedAt))}</span><span>Médiane : {formatMoney(item.medianPrice)}</span><span>Prix : {formatMoney(item.currentVehiclePrice)}</span><span>Écart : {item.priceDifference == null ? "—" : money.format(item.priceDifference)}</span></div>)}</div></details>}
    </CardContent>
  </Card>
}

function formatMoney(value: number | null) { return value == null ? "Non renseigné" : money.format(value) }
function Metric({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) { return <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={emphasized ? "mt-1 text-xl font-semibold" : "mt-1 font-semibold"}>{value}</p></div> }

import { ExternalLink } from "lucide-react"
import type { MarketVehicleInsight } from "../../presentation"

export function MarketVehicleDetails({ insight }: { insight: MarketVehicleInsight }) {
  return (
    <details className="rounded-lg border p-4">
      <summary className="cursor-pointer font-medium">Voir l’analyse détaillée</summary>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <dl className="grid grid-cols-2 gap-3">
          {insight.detail.statistics.map((item) => <div key={item.label}><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="font-medium">{item.value}</dd></div>)}
        </dl>
        <div>
          <h4 className="font-medium">Messages métier</h4>
          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
            {[...insight.warnings, ...insight.opportunities].map((message) => <li key={message.key}>{message.text}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-6">
        <h4 className="font-medium">Comparables retenus</h4>
        {insight.detail.comparables.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">
          {insight.detail.comparables.map((row) => <article key={row.id} className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium">{row.title}</p><p>{row.price} · {row.year} · {row.mileage}</p><p className="text-muted-foreground">{row.location} · {row.source} · {row.sellerType}</p>
            {row.href && <a href={row.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 underline">Voir l’annonce <ExternalLink aria-hidden="true" className="size-3" /></a>}
          </article>)}
        </div> : <p className="mt-2 text-sm text-muted-foreground">Aucun comparable retenu.</p>}
      </div>
    </details>
  )
}

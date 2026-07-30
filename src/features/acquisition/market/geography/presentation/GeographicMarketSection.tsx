import { Badge } from "@/components/ui/badge"
import type { GeographicMarketViewModel } from "../types"

export function GeographicMarketSection({
  geography,
}: {
  readonly geography: GeographicMarketViewModel
}) {
  return (
    <section aria-labelledby="geographic-market-title" className="space-y-3 border-t pt-6">
      <div>
        <h3 id="geographic-market-title" className="font-semibold">{geography.title}</h3>
        <p className="text-sm text-muted-foreground">{geography.description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {geography.metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="mt-1 font-semibold">{metric.value}</p>
          </div>
        ))}
      </div>
      {geography.signals.length ? (
        <div className="flex flex-wrap gap-2">
          {geography.signals.map((signal) => (
            <Badge key={signal.code} variant="outline" title={signal.explanation}>
              {signal.label}
            </Badge>
          ))}
        </div>
      ) : null}
    </section>
  )
}

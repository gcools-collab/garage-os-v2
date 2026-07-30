import { ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import type { AcquisitionMarketViewModel } from "../presentation"

export function AcquisitionMarketCard({
  market,
}: {
  readonly market: AcquisitionMarketViewModel
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{market.title}</CardTitle>
            <CardDescription>{market.description}</CardDescription>
          </div>
          <Badge variant="outline">Analyse déterministe</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {market.metrics.map((metric) => (
            <div key={metric.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="mt-1 font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
        {market.signals.length ? (
          <div className="flex flex-wrap gap-2">
            {market.signals.map((signal) => (
              <Badge
                key={signal.code}
                variant={signal.tone === "warning"
                  ? "destructive"
                  : signal.tone === "positive" ? "default" : "secondary"}
                title={signal.explanation}
              >
                {signal.label}
              </Badge>
            ))}
          </div>
        ) : null}
        {market.comparables.length ? (
          <div>
            <h3 className="font-semibold">Annonces comparables</h3>
            <div className="mt-3 divide-y rounded-lg border">
              {market.comparables.map((item) => (
                <article
                  key={item.id}
                  className="grid items-center gap-3 p-3 text-sm sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.price}</span>
                      <Badge variant="outline">{item.source}</Badge>
                      <Badge variant="secondary">Prix affiché</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {item.details} · {item.location}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.dataQuality} · {item.similarity}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.explanation}
                    </p>
                  </div>
                  {item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                    >
                      Voir l’annonce
                      <ExternalLink className="size-3" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Lien indisponible</span>
                  )}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            {market.emptyMessage}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

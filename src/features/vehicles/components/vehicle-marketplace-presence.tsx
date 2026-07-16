import { ExternalLink, Globe2, Heart, RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  marketplaceLinkStatusLabels,
  type MarketplaceLinkStatus,
} from "../marketplace-status"

export type VehicleMarketplaceLink = {
  id: string
  provider: string
  url: string
  status: MarketplaceLinkStatus
  advertised_price: number | string | null
  favorite_count: number | null
  published_at: string | null
  last_seen_at: string | null
}

const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const date = new Intl.DateTimeFormat("fr-FR")

function providerLabel(provider: string) {
  return provider.toLocaleLowerCase("fr-FR") === "leboncoin" ? "Leboncoin" : provider
}

function onlineDuration(publishedAt: string | null) {
  if (!publishedAt) return "Date de publication inconnue"
  const elapsed = Math.max(0, Date.now() - new Date(publishedAt).getTime())
  const days = Math.floor(elapsed / 86_400_000)
  return `Publié depuis ${days} jour${days > 1 ? "s" : ""}`
}

export function VehicleMarketplacePresence({ links }: { links: VehicleMarketplaceLink[] }) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-xs sm:p-6">
      <div className="border-b pb-5">
        <h2 className="text-xl font-semibold">Présence en ligne</h2>
        <p className="mt-1 text-sm text-muted-foreground">État des annonces marketplace, indépendant du statut métier du véhicule.</p>
      </div>
      {links.length === 0 ? (
        <div className="mt-5 flex min-h-28 items-center justify-center rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">Aucune annonce marketplace liée.</div>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {links.map((link) => (
            <article key={link.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2"><Globe2 className="size-4 text-muted-foreground" /><h3 className="font-semibold">{providerLabel(link.provider)}</h3></div>
                <Badge variant={link.status === "ACTIVE" ? "default" : "secondary"}>{marketplaceLinkStatusLabels[link.status]}</Badge>
              </div>
              <p className="mt-3 text-sm font-medium">{onlineDuration(link.published_at)}</p>
              {link.published_at && <p className="mt-1 text-xs text-muted-foreground">Publication le {date.format(new Date(link.published_at))}</p>}
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-muted-foreground">Prix affiché</dt><dd className="mt-1 font-semibold">{link.advertised_price == null ? "Non disponible" : currency.format(Number(link.advertised_price))}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Favoris</dt><dd className="mt-1 flex items-center gap-1.5 font-semibold"><Heart className="size-3.5" />{link.favorite_count == null ? "Non disponible" : link.favorite_count.toLocaleString("fr-FR")}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><RefreshCw className="size-3.5" />Dernière observation : {link.last_seen_at ? date.format(new Date(link.last_seen_at)) : "inconnue"}</span>
                <Button asChild variant="outline" size="sm"><a href={link.url} target="_blank" rel="noreferrer">Voir l’annonce<ExternalLink /></a></Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

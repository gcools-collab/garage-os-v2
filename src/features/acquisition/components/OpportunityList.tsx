import Link from "next/link"
import { ArrowRight, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { AcquisitionListItemViewModel } from "../presentation/opportunity-view-model"

export function OpportunityList({ items }: { readonly items: readonly AcquisitionListItemViewModel[] }) {
  if (!items.length) return (
    <Card><CardContent className="flex flex-col items-center gap-4 py-14 text-center">
      <div><h2 className="font-semibold">Aucune opportunité</h2><p className="text-sm text-muted-foreground">Centralisez ici les véhicules proposés au garage.</p></div>
      <Button asChild><Link href="/acquisition/new"><Plus />Créer une opportunité</Link></Button>
    </CardContent></Card>
  )
  return <div className="grid gap-3">{items.map((item) => (
    <Link key={item.id} href={`/acquisition/${item.id}`} className="group">
      <Card className="transition-shadow group-hover:shadow-md"><CardContent className="grid items-center gap-3 py-4 sm:grid-cols-[2fr_1.2fr_1fr_1fr_auto]">
        <div><p className="font-semibold">{item.vehicle}</p><p className="text-sm text-muted-foreground">{item.seller}</p></div>
        <p className="text-sm">{item.askingPrice}</p>
        <p className="text-sm text-muted-foreground">{item.provenance}</p>
        <div><Badge variant="secondary">{item.status}</Badge><p className="mt-1 text-xs text-muted-foreground">{item.createdAt}</p></div>
        <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
      </CardContent></Card>
    </Link>
  ))}</div>
}

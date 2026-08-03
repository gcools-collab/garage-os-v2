import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Vehicle360EditorViewModel } from "../types"
import { Vehicle360ViewerClient } from "./Vehicle360ViewerClient"
import { MediaQualityReportCard } from "@/features/media-quality"

export function Vehicle360Workspace({ editor }: { readonly editor: Vehicle360EditorViewModel }) {
  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Résumé</CardTitle><CardDescription>État actuel de la visite extérieure.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4"><strong>{editor.statusLabel}</strong><span>{editor.frameCountLabel}</span><span>{editor.coverage.score} % prêt</span><span>{editor.publicLabel}</span></CardContent></Card>
    <Card><CardHeader><CardTitle>Guide de prise de vue</CardTitle></CardHeader><CardContent><ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2"><li>Conservez la même distance et la même hauteur.</li><li>Faites un tour complet dans une lumière stable.</li><li>Évitez personnes et objets en mouvement.</li><li>Prenez idéalement 24 à 36 photos.</li></ul></CardContent></Card>
    <Card><CardHeader><CardTitle>Contrôle</CardTitle><CardDescription>{editor.coverage.summary}</CardDescription></CardHeader><CardContent className="space-y-2">{editor.coverage.rules.map((rule) => <p key={rule.id} className="text-sm"><strong>{rule.state}</strong> — {rule.description}</p>)}</CardContent></Card>
    <MediaQualityReportCard report={editor.mediaQuality} />
    {editor.viewer ? <Card><CardHeader><CardTitle>Prévisualisation</CardTitle><CardDescription>Faites glisser ou utilisez les flèches.</CardDescription></CardHeader><CardContent><Vehicle360ViewerClient viewer={editor.viewer} /></CardContent></Card> : null}
    <Button asChild variant="outline"><Link href={`/stock/${editor.vehicleId}`}>Retour à la fiche</Link></Button>
  </div>
}

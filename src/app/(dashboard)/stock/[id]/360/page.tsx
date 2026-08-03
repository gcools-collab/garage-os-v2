import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createVehicle360Sequence, reorderVehicle360Frame, reverseVehicle360Frames, setVehicle360FrameExcluded, setVehicle360StartFrame, setVehicle360Status, uploadVehicle360Frames } from "@/features/vehicle-360/actions"
import { Vehicle360GalleryBuilder, Vehicle360Workspace } from "@/features/vehicle-360"
import { getVehicle360Sequence } from "@/features/vehicle-360/repositories"
import { createClient } from "@/lib/supabase/server"
import { MediaAiAnalysisPanel } from "@/features/media-quality/components/MediaAiAnalysisPanel"

export default async function Vehicle360Page({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: vehicle } = await supabase.from("vehicles").select("id,brand,model").eq("id", id).maybeSingle()
  if (!vehicle) notFound()
  const sequence = await getVehicle360Sequence(id)
  if (!sequence) return <div className="mx-auto max-w-4xl"><Card><CardHeader><CardTitle>Visite extérieure 360°</CardTitle><CardDescription>Créez une séquence ordonnée de 24 à 36 photographies.</CardDescription></CardHeader><CardContent><form action={createVehicle360Sequence.bind(null, id)}><Button type="submit">Créer la visite 360°</Button></form></CardContent></Card></div>
  const editor = new Vehicle360GalleryBuilder().build(sequence, `${vehicle.brand} ${vehicle.model}`)
  return <div className="mx-auto max-w-5xl space-y-6 pb-8">
    <header><h1 className="text-3xl font-semibold">Visite extérieure 360°</h1><p className="mt-2 text-muted-foreground">{vehicle.brand} {vehicle.model}</p></header>
    <Card><CardHeader><CardTitle>Importer les images</CardTitle><CardDescription>JPEG, PNG ou WebP · 15 Mo maximum · 48 images par séquence.</CardDescription></CardHeader><CardContent><form action={uploadVehicle360Frames.bind(null, id)} className="flex flex-col gap-3 sm:flex-row"><input type="file" name="frames" accept="image/jpeg,image/png,image/webp" multiple required className="min-w-0 flex-1 rounded-md border p-2"/><Button type="submit">Importer</Button></form></CardContent></Card>
    <Vehicle360Workspace editor={editor} />
    <MediaAiAnalysisPanel vehicleId={id} />
    <Card><CardHeader><CardTitle>Séquence</CardTitle><CardDescription>L’ordre est enregistré immédiatement.</CardDescription></CardHeader><CardContent className="space-y-3"><form action={reverseVehicle360Frames.bind(null, id)}><Button type="submit" variant="outline">Inverser la séquence</Button></form><ol className="grid gap-2 sm:grid-cols-2">{editor.frames.map((frame, index) => <li key={frame.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3"><span className="mr-auto text-sm font-medium">{frame.positionLabel}{frame.isStart ? " · Départ" : ""}{frame.status === "EXCLUDED" ? " · Exclue" : ""}</span><form action={reorderVehicle360Frame.bind(null, id, frame.id, -1)}><Button type="submit" size="sm" variant="outline" disabled={index === 0}>←</Button></form><form action={reorderVehicle360Frame.bind(null, id, frame.id, 1)}><Button type="submit" size="sm" variant="outline" disabled={index === editor.frames.length - 1}>→</Button></form><form action={setVehicle360StartFrame.bind(null, id, frame.id)}><Button type="submit" size="sm" variant="outline" disabled={frame.status !== "READY"}>Départ</Button></form><form action={setVehicle360FrameExcluded.bind(null, id, frame.id, frame.status !== "EXCLUDED")}><Button type="submit" size="sm" variant="ghost">{frame.status === "EXCLUDED" ? "Réintégrer" : "Exclure"}</Button></form></li>)}</ol></CardContent></Card>
    <div className="flex flex-wrap gap-3">{sequence.status === "READY" ? <form action={setVehicle360Status.bind(null, id, "PUBLISHED")}><Button type="submit">Publier la visite</Button></form> : null}{sequence.status === "PUBLISHED" ? <form action={setVehicle360Status.bind(null, id, "READY")}><Button type="submit" variant="outline">Dépublier</Button></form> : null}<form action={setVehicle360Status.bind(null, id, "ARCHIVED")}><Button type="submit" variant="destructive">Archiver</Button></form></div>
  </div>
}

import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createVehicle360Sequence,
  deleteVehicle360Frame,
  reorderVehicle360Frame,
  reverseVehicle360Frames,
  setVehicle360FrameExcluded,
  setVehicle360StartFrame,
  setVehicle360Status,
} from "@/features/vehicle-360/actions"
import { Vehicle360GalleryBuilder, Vehicle360Workspace } from "@/features/vehicle-360"
import { Vehicle360UploadClient } from "@/features/vehicle-360/components/Vehicle360UploadClient"
import { getVehicle360Sequence } from "@/features/vehicle-360/repositories"
import { createClient } from "@/lib/supabase/server"
import { MediaAiAnalysisPanel } from "@/features/media-quality/components/MediaAiAnalysisPanel"

export default async function Vehicle360Page({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: vehicle } = await supabase.from("vehicles").select("id,brand,model").eq("id", id).maybeSingle()
  if (!vehicle) notFound()
  const sequence = await getVehicle360Sequence(id)
  if (!sequence) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>360° extérieur</CardTitle>
            <CardDescription>
              Photographiez le véhicule en faisant le tour complet. Idéalement 24 à 36 vues régulièrement espacées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createVehicle360Sequence.bind(null, id)}>
              <Button type="submit" className="min-h-11">Créer le 360° extérieur</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }
  const editor = new Vehicle360GalleryBuilder().build(sequence, `${vehicle.brand} ${vehicle.model}`)
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pb-8">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">360° extérieur</h1>
        <p className="mt-2 text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Ajouter des vues</CardTitle>
          <CardDescription>Utilisez l&apos;appareil photo ou la galerie · JPEG, PNG ou WebP · 15 Mo max · 48 vues max.</CardDescription>
        </CardHeader>
        <CardContent><Vehicle360UploadClient vehicleId={id} /></CardContent>
      </Card>
      <Vehicle360Workspace editor={editor} />
      <MediaAiAnalysisPanel vehicleId={id} />
      <Card>
        <CardHeader>
          <CardTitle>Séquence</CardTitle>
          <CardDescription>Réordonnez, excluez ou supprimez une vue avant publication.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={reverseVehicle360Frames.bind(null, id)}>
            <Button type="submit" variant="outline" className="min-h-11">Inverser la séquence</Button>
          </form>
          <ol className="grid gap-2 sm:grid-cols-2">
            {editor.frames.map((frame, index) => (
              <li key={frame.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
                <span className="mr-auto text-sm font-medium">
                  {frame.positionLabel}
                  {frame.isStart ? " · Départ" : ""}
                  {frame.status === "EXCLUDED" ? " · Exclue" : ""}
                </span>
                <form action={reorderVehicle360Frame.bind(null, id, frame.id, -1)}>
                  <Button type="submit" size="sm" variant="outline" disabled={index === 0} className="min-h-10 min-w-10">←</Button>
                </form>
                <form action={reorderVehicle360Frame.bind(null, id, frame.id, 1)}>
                  <Button type="submit" size="sm" variant="outline" disabled={index === editor.frames.length - 1} className="min-h-10 min-w-10">→</Button>
                </form>
                <form action={setVehicle360StartFrame.bind(null, id, frame.id)}>
                  <Button type="submit" size="sm" variant="outline" disabled={frame.status !== "READY"} className="min-h-10">Départ</Button>
                </form>
                <form action={setVehicle360FrameExcluded.bind(null, id, frame.id, frame.status !== "EXCLUDED")}>
                  <Button type="submit" size="sm" variant="ghost" className="min-h-10">{frame.status === "EXCLUDED" ? "Réintégrer" : "Exclure"}</Button>
                </form>
                <form action={deleteVehicle360Frame.bind(null, id, frame.id)}>
                  <Button type="submit" size="sm" variant="destructive" className="min-h-10">Supprimer</Button>
                </form>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3">
        {sequence.status === "READY" ? (
          <form action={setVehicle360Status.bind(null, id, "PUBLISHED")}>
            <Button type="submit" className="min-h-11">Publier le 360°</Button>
          </form>
        ) : null}
        {sequence.status === "PUBLISHED" ? (
          <form action={setVehicle360Status.bind(null, id, "READY")}>
            <Button type="submit" variant="outline" className="min-h-11">Dépublier</Button>
          </form>
        ) : null}
        <form action={setVehicle360Status.bind(null, id, "ARCHIVED")}>
          <Button type="submit" variant="destructive" className="min-h-11">Archiver</Button>
        </form>
      </div>
    </div>
  )
}

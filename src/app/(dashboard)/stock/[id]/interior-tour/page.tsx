import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  createInteriorHotspot,
  createInteriorTour,
  deleteInteriorHotspot,
  deleteInteriorScene,
  moveInteriorScene,
  setInteriorSceneExcluded,
  setInteriorStartScene,
  setInteriorTourStatus,
  updateInteriorHotspot,
  updateInteriorScene,
} from "@/features/interior-tour/actions"
import { InteriorTourSceneBuilder, InteriorTourWorkspace } from "@/features/interior-tour"
import { InteriorTourUploadClient } from "@/features/interior-tour/components/InteriorTourUploadClient"
import { getInteriorTour } from "@/features/interior-tour/repositories"
import { createClient } from "@/lib/supabase/server"

export default async function InteriorTourPage({ params }: { readonly params: Promise<{ readonly id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: vehicle } = await supabase.from("vehicles").select("id,brand,model").eq("id", id).maybeSingle()
  if (!vehicle) notFound()
  const tour = await getInteriorTour(id)
  if (!tour) {
    return (
      <div className="mx-auto max-w-4xl px-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>Visite intérieure</CardTitle>
            <CardDescription>Créez une visite panoramique immersive de l&apos;habitacle.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createInteriorTour.bind(null, id)}>
              <Button type="submit" className="min-h-11">Créer la visite intérieure</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const editor = new InteriorTourSceneBuilder().build(tour, `${vehicle.brand} ${vehicle.model}`)
  const ready = tour.scenes.filter((scene) => scene.status === "READY")

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Visite intérieure</h1>
        <p className="mt-2 text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Importer des panoramas</CardTitle>
          <CardDescription>Format équirectangulaire 2:1 recommandé · JPEG, PNG ou WebP · 20 Mo max.</CardDescription>
        </CardHeader>
        <CardContent><InteriorTourUploadClient vehicleId={id} /></CardContent>
      </Card>
      <InteriorTourWorkspace editor={editor} />
      <Card>
        <CardHeader>
          <CardTitle>Scènes</CardTitle>
          <CardDescription>Nommez, ordonnez et réglez la vue initiale de chaque panorama.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {tour.scenes.map((scene, index) => (
              <li key={scene.id} className="rounded-xl border p-4">
                <form action={updateInteriorScene.bind(null, id, scene.id)} className="grid gap-3 md:grid-cols-[2fr_repeat(3,1fr)_auto]">
                  <label className="grid gap-1 text-sm">Nom<input name="name" defaultValue={scene.name} required maxLength={80} className="min-h-11 rounded-md border px-3 py-2" /></label>
                  <label className="grid gap-1 text-sm">Yaw<input name="initialYaw" type="number" min={-180} max={180} defaultValue={scene.initialYaw ?? 0} className="min-h-11 rounded-md border px-3 py-2" /></label>
                  <label className="grid gap-1 text-sm">Pitch<input name="initialPitch" type="number" min={-90} max={90} defaultValue={scene.initialPitch ?? 0} className="min-h-11 rounded-md border px-3 py-2" /></label>
                  <label className="grid gap-1 text-sm">Champ de vue<input name="initialFov" type="number" min={30} max={120} defaultValue={scene.initialFov ?? 90} className="min-h-11 rounded-md border px-3 py-2" /></label>
                  <Button type="submit" className="min-h-11 self-end">Enregistrer</Button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={moveInteriorScene.bind(null, id, scene.id, -1)}><Button size="sm" variant="outline" disabled={index === 0} className="min-h-10 min-w-10">←</Button></form>
                  <form action={moveInteriorScene.bind(null, id, scene.id, 1)}><Button size="sm" variant="outline" disabled={index === tour.scenes.length - 1} className="min-h-10 min-w-10">→</Button></form>
                  <form action={setInteriorStartScene.bind(null, id, scene.id)}><Button size="sm" variant="outline" disabled={scene.status !== "READY" || scene.id === tour.startSceneId} className="min-h-10">{scene.id === tour.startSceneId ? "Scène de départ" : "Définir au départ"}</Button></form>
                  <form action={setInteriorSceneExcluded.bind(null, id, scene.id, scene.status !== "EXCLUDED")}><Button size="sm" variant="ghost" className="min-h-10">{scene.status === "EXCLUDED" ? "Réintégrer" : "Exclure"}</Button></form>
                  <form action={deleteInteriorScene.bind(null, id, scene.id)}><Button size="sm" variant="destructive" className="min-h-10">Supprimer</Button></form>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Liens de navigation</CardTitle>
          <CardDescription>Reliez une scène à une autre pour guider le visiteur dans l&apos;habitacle.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {ready.length > 1 ? (
            <form action={createInteriorHotspot.bind(null, id)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="grid gap-1 text-sm">Depuis<select name="sourceSceneId" className="min-h-11 rounded-md border px-3 py-2">{ready.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}</option>)}</select></label>
              <label className="grid gap-1 text-sm">Vers<select name="targetSceneId" className="min-h-11 rounded-md border px-3 py-2">{ready.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}</option>)}</select></label>
              <label className="grid gap-1 text-sm">Libellé<input name="label" required maxLength={80} className="min-h-11 rounded-md border px-3 py-2" /></label>
              <label className="grid gap-1 text-sm">Yaw<input name="yaw" type="number" min={-180} max={180} defaultValue={0} className="min-h-11 rounded-md border px-3 py-2" /></label>
              <label className="grid gap-1 text-sm">Pitch<input name="pitch" type="number" min={-90} max={90} defaultValue={0} className="min-h-11 rounded-md border px-3 py-2" /></label>
              <Button type="submit" className="min-h-11 sm:col-span-2 lg:col-span-5">Ajouter le lien</Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Ajoutez au moins deux scènes prêtes pour créer une navigation.</p>
          )}
          <ul className="space-y-2">
            {editor.hotspots.map((hotspot) => {
              const source = tour.hotspots.find((item) => item.id === hotspot.id)
              return (
                <li key={hotspot.id} className="rounded-lg border p-3 space-y-3">
                  <p className="text-sm font-medium">{hotspot.sourceLabel} → {hotspot.targetLabel}</p>
                  <form action={updateInteriorHotspot.bind(null, id, hotspot.id)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid gap-1 text-sm sm:col-span-2">Libellé<input name="label" defaultValue={hotspot.label} required maxLength={80} className="min-h-11 rounded-md border px-3 py-2" /></label>
                    <label className="grid gap-1 text-sm sm:col-span-2">Vers<select name="targetSceneId" defaultValue={source?.targetSceneId} className="min-h-11 rounded-md border px-3 py-2">{ready.map((scene) => <option key={scene.id} value={scene.id}>{scene.name}</option>)}</select></label>
                    <label className="grid gap-1 text-sm">Yaw<input name="yaw" type="number" min={-180} max={180} defaultValue={source?.yaw ?? 0} className="min-h-11 rounded-md border px-3 py-2" /></label>
                    <label className="grid gap-1 text-sm">Pitch<input name="pitch" type="number" min={-90} max={90} defaultValue={source?.pitch ?? 0} className="min-h-11 rounded-md border px-3 py-2" /></label>
                    <Button type="submit" className="min-h-11 sm:col-span-2 lg:col-span-4">Enregistrer le lien</Button>
                  </form>
                  <form action={deleteInteriorHotspot.bind(null, id, hotspot.id)}>
                    <Button type="submit" size="sm" variant="destructive" className="min-h-10">Supprimer le lien</Button>
                  </form>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-3">
        {tour.status === "DRAFT" ? (
          <form action={setInteriorTourStatus.bind(null, id, "READY")}><Button type="submit" variant="outline" className="min-h-11">Marquer prête</Button></form>
        ) : null}
        {tour.status === "READY" ? (
          <form action={setInteriorTourStatus.bind(null, id, "PUBLISHED")}><Button type="submit" disabled={!editor.validation.ready} className="min-h-11">Publier</Button></form>
        ) : null}
        {tour.status === "PUBLISHED" ? (
          <form action={setInteriorTourStatus.bind(null, id, "READY")}><Button type="submit" variant="outline" className="min-h-11">Dépublier</Button></form>
        ) : null}
        <form action={setInteriorTourStatus.bind(null, id, "ARCHIVED")}><Button type="submit" variant="destructive" className="min-h-11">Archiver</Button></form>
      </div>
    </div>
  )
}

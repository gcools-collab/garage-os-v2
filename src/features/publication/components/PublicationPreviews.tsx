import Image from "next/image"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  PublicationPreviewViewModel,
  PublicationSeoPreviewViewModel,
} from "../presentation"

export function PublicationPublicPreview({
  preview,
}: {
  readonly preview: PublicationPreviewViewModel
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Prévisualisation du site public</CardTitle>
        <CardDescription>{preview.publicUrl}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-muted">
          {preview.cover ? (
            <Image src={preview.cover.url} alt={preview.cover.alt} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Couverture indisponible</div>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-semibold">{preview.vehicleTitle}</h3><p className="text-lg">{preview.price}</p></div>
          <Badge variant="secondary">{preview.available ? "En ligne" : "Aperçu privé"}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

export function PublicationSeoPreview({
  preview,
}: {
  readonly preview: PublicationSeoPreviewViewModel
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Prévisualisation SEO</CardTitle>
        <CardDescription>Informations préparées par le SEO Builder du site public.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4">
          <p className="truncate text-sm text-emerald-700">{preview.canonicalPath}</p>
          <h3 className="mt-1 text-lg font-medium text-blue-700">{preview.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{preview.description}</p>
        </div>
        <dl className="grid gap-3 text-sm">
          <div><dt className="text-muted-foreground">Slug</dt><dd className="break-all font-medium">{preview.slug}</dd></div>
          <div><dt className="text-muted-foreground">Image OpenGraph</dt><dd>{preview.openGraphImage ? "Disponible" : "À compléter"}</dd></div>
        </dl>
      </CardContent>
    </Card>
  )
}

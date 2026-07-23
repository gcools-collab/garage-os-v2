"use client"

import { useState, useTransition } from "react"
import { Download, ExternalLink, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getVehicleDocumentCategoryDefinition } from "./document-categories"
import { createVehicleDocumentSignedUrl } from "./vehicle-document-actions"
import { EditDocumentDialog } from "./edit-document-dialog"
import { VehicleDocumentDeleteDialog } from "./vehicle-document-delete-dialog"
import type { VehicleDocument } from "./types"

function formatSize(bytes: number | null) {
  if (bytes === null) return "Taille inconnue"
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`
  return `${(bytes / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`
}

export function VehicleDocumentCard({ document }: { document: VehicleDocument }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  const definition = getVehicleDocumentCategoryDefinition(document.category)
  function openDocument(download: boolean) {
    const target = window.open("", "_blank", "noopener,noreferrer")
    setError(undefined)
    startTransition(async () => {
      const result = await createVehicleDocumentSignedUrl(document.id, document.vehicle_id, download)
      if (result.success && result.url) {
        if (target) target.location.href = result.url
        else window.location.href = result.url
      } else {
        target?.close()
        setError(result.message ?? "Impossible d’ouvrir le document.")
      }
    })
  }
  return <article className="rounded-xl border p-4"><div className="flex gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"><FileText className="size-5 text-muted-foreground" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="truncate font-semibold">{document.label}</h3><Badge variant="secondary" className="mt-1">{definition.label}</Badge></div><div className="flex items-center"><Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => openDocument(false)}><ExternalLink /><span className="sr-only">Ouvrir</span></Button><Button variant="ghost" size="icon-sm" disabled={pending} onClick={() => openDocument(true)}><Download /><span className="sr-only">Télécharger</span></Button><EditDocumentDialog document={document} /><VehicleDocumentDeleteDialog documentId={document.id} vehicleId={document.vehicle_id} label={document.label} /></div></div><p className="mt-3 truncate text-sm text-muted-foreground">{document.original_filename}</p><p className="mt-1 text-xs text-muted-foreground">{document.mime_type ?? "Type inconnu"} · {formatSize(document.size_bytes)} · ajouté le {new Intl.DateTimeFormat("fr-FR").format(new Date(document.created_at))}</p>{error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}</div></div></article>
}

"use client"

import { Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { uploadVehicle360Frames } from "../actions/vehicle-360-actions"

export function Vehicle360UploadClient({ vehicleId }: { readonly vehicleId: string }) {
  const router = useRouter()
  const [selectedCount, setSelectedCount] = useState(0)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        setFeedback(null)
        startTransition(async () => {
          const result = await uploadVehicle360Frames(vehicleId, formData)
          const parts = [
            result.uploaded > 0 ? `${result.uploaded} vue${result.uploaded > 1 ? "s" : ""} importée${result.uploaded > 1 ? "s" : ""}` : null,
            result.skipped > 0 ? `${result.skipped} ignorée${result.skipped > 1 ? "s" : ""}` : null,
            ...result.errors,
          ].filter(Boolean)
          setFeedback(parts.join(" · ") || "Aucun fichier importé.")
          event.currentTarget.reset()
          setSelectedCount(0)
          router.refresh()
        })
      }}
    >
      <input
        type="file"
        name="frames"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        required
        disabled={pending}
        className="min-h-11 w-full rounded-md border bg-background p-2 text-sm"
        onChange={(event) => setSelectedCount(event.currentTarget.files?.length ?? 0)}
      />
      <Button type="submit" disabled={pending || selectedCount === 0} className="min-h-11 self-start">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {pending ? "Import en cours…" : `Importer ${selectedCount > 0 ? `(${selectedCount})` : ""}`}
      </Button>
      {feedback ? <p role="status" className="text-sm text-muted-foreground">{feedback}</p> : null}
    </form>
  )
}

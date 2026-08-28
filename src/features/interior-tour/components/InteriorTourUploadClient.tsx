"use client"

import { Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { uploadInteriorScenes } from "../actions/interior-tour-actions"

export function InteriorTourUploadClient({ vehicleId }: { readonly vehicleId: string }) {
  const router = useRouter()
  const [selectedCount, setSelectedCount] = useState(0)
  const [pending, startTransition] = useTransition()

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row sm:items-start"
      onSubmit={(event) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        startTransition(async () => {
          await uploadInteriorScenes(vehicleId, formData)
          event.currentTarget.reset()
          setSelectedCount(0)
          router.refresh()
        })
      }}
    >
      <input
        type="file"
        name="scenes"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        required
        disabled={pending}
        className="min-h-11 min-w-0 flex-1 rounded-md border bg-background p-2 text-sm"
        onChange={(event) => setSelectedCount(event.currentTarget.files?.length ?? 0)}
      />
      <Button type="submit" disabled={pending || selectedCount === 0} className="min-h-11 shrink-0">
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
        {pending ? "Import…" : "Importer"}
      </Button>
    </form>
  )
}

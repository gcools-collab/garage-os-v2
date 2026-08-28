"use client"

import { Camera, Loader2, Upload } from "lucide-react"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { uploadVehicleImages } from "../image-actions"

type VehicleImageUploadClientProps = {
  readonly vehicleId: string
}

export function VehicleImageUploadClient({ vehicleId }: VehicleImageUploadClientProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedCount, setSelectedCount] = useState(0)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    setMessage(null)
    startTransition(async () => {
      const result = await uploadVehicleImages(formData)
      if (result.ok) {
        setMessage(`${result.uploaded} photo${result.uploaded > 1 ? "s" : ""} importée${result.uploaded > 1 ? "s" : ""}.`)
        form.reset()
        setSelectedCount(0)
        router.refresh()
      } else {
        setMessage(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border bg-muted/30 p-3 sm:p-4">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input
        ref={inputRef}
        id={`vehicle-images-${vehicleId}`}
        name="images"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        multiple
        disabled={pending}
        className="peer sr-only"
        onChange={(event) => setSelectedCount(event.currentTarget.files?.length ?? 0)}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <label
          htmlFor={`vehicle-images-${vehicleId}`}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "min-h-11 cursor-pointer justify-center px-4",
            pending && "pointer-events-none opacity-60",
          )}
        >
          <Camera aria-hidden="true" />
          {selectedCount > 0 ? `${selectedCount} photo${selectedCount > 1 ? "s" : ""} sélectionnée${selectedCount > 1 ? "s" : ""}` : "Appareil photo ou galerie"}
        </label>
        <Button type="submit" disabled={pending || selectedCount === 0} className="min-h-11">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
          {pending ? "Import en cours…" : "Importer"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        JPG, PNG ou WebP · 10 photos max · 10 Mo par fichier
      </p>
      {message ? (
        <p
          role="status"
          className={cn(
            "mt-2 text-sm",
            message.includes("importée") ? "text-emerald-700" : "text-destructive",
          )}
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}

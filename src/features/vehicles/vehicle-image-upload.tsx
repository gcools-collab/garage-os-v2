import { uploadVehicleImages } from "./image-actions"
import { Camera, Upload } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type VehicleImageUploadProps = {
  vehicleId: string
}

export function VehicleImageUpload({
  vehicleId,
}: VehicleImageUploadProps) {
  return (
    <form
      action={uploadVehicleImages}
      className="rounded-lg border bg-muted/30 p-3"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          id="vehicle-images"
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required
          className="peer sr-only"
        />
        <label
          htmlFor="vehicle-images"
          className={cn(buttonVariants({ variant: "outline" }), "cursor-pointer")}
        >
          <Camera aria-hidden="true" />
          Choisir des photos
        </label>
        <Button type="submit"><Upload aria-hidden="true" />Importer</Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">JPG, PNG ou WebP · sélection multiple.</p>
    </form>
  )
}

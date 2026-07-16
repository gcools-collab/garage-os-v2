import { uploadVehicleImages } from "./image-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type VehicleImageUploadProps = {
  vehicleId: string
}

export function VehicleImageUpload({
  vehicleId,
}: VehicleImageUploadProps) {
  return (
    <form
      action={uploadVehicleImages}
      className="flex flex-col gap-3 sm:flex-row sm:items-end"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <div className="flex-1 space-y-2">
        <label htmlFor="vehicle-images" className="text-sm font-medium">
          Ajouter des photos
        </label>

        <Input
          id="vehicle-images"
          name="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          required
        />
      </div>

      <Button type="submit">Importer les photos</Button>
    </form>
  )
}

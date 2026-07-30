import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export function revalidateGarageLive({
  garageSlug,
  vehicleSlug,
}: {
  readonly garageSlug: string
  readonly vehicleSlug?: string | null
}) {
  const basePath = `/g/${encodeURIComponent(garageSlug)}`
  revalidatePath(basePath)
  revalidatePath(`${basePath}/vehicles`)
  if (vehicleSlug) revalidatePath(`${basePath}/vehicles/${encodeURIComponent(vehicleSlug)}`)
}

export async function revalidateVehicleLiveById(vehicleId: string) {
  const supabase = await createClient()
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("garage_id, live_slug")
    .eq("id", vehicleId)
    .maybeSingle()
  if (!vehicle) return
  const { data: garage } = await supabase
    .from("garages")
    .select("live_slug")
    .eq("id", vehicle.garage_id)
    .maybeSingle()
  if (!garage?.live_slug) return
  revalidateGarageLive({ garageSlug: garage.live_slug, vehicleSlug: vehicle.live_slug })
}

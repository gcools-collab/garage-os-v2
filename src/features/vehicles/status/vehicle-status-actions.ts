"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  revalidateGarageLive,
  validateVehicleForPublication,
} from "@/features/live-stock"
import { isVehicleStatusTransitionAllowed } from "./vehicle-status-transitions"
import {
  getVehicleStatusLabel,
  vehicleStatusSchema,
  type VehicleStatus,
} from "./vehicle-status"

const statusChangeSchema = z.object({
  vehicleId: z.uuid(),
  nextStatus: vehicleStatusSchema,
})

export type VehicleStatusActionResult = {
  success: boolean
  message: string
  warning?: string
}

function getStatusEventDescription(
  previousStatus: VehicleStatus,
  nextStatus: VehicleStatus
) {
  if (nextStatus === "RESERVED") return "Véhicule réservé"
  if (nextStatus === "SOLD") return "Véhicule vendu"
  if (nextStatus === "DELIVERED") return "Véhicule livré"
  return `Statut changé : ${getVehicleStatusLabel(previousStatus)} → ${getVehicleStatusLabel(nextStatus)}`
}

export async function updateVehicleStatus(
  vehicleId: string,
  nextStatus: string
): Promise<VehicleStatusActionResult> {
  const parsed = statusChangeSchema.safeParse({ vehicleId, nextStatus })
  if (!parsed.success) {
    return { success: false, message: "Le changement de statut est invalide." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Utilisateur non authentifié." }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, garage_id, live_slug, status, publication_status, published_at, brand, model, year, mileage, selling_price, description")
    .eq("id", parsed.data.vehicleId)
    .maybeSingle()
  const currentStatus = vehicleStatusSchema.safeParse(vehicle?.status)
  if (vehicleError || !vehicle || !currentStatus.success) {
    return { success: false, message: "Véhicule introuvable ou inaccessible." }
  }

  if (!isVehicleStatusTransitionAllowed(currentStatus.data, parsed.data.nextStatus)) {
    return {
      success: false,
      message: `La transition ${getVehicleStatusLabel(currentStatus.data)} → ${getVehicleStatusLabel(parsed.data.nextStatus)} n'est pas autorisée.`,
    }
  }

  if (parsed.data.nextStatus === "PUBLISHED") {
    const { count: photoCount, error: photoError } = await supabase
      .from("vehicle_images")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", parsed.data.vehicleId)
    if (photoError) {
      return { success: false, message: "Impossible de vérifier les photos du véhicule." }
    }
    const validation = validateVehicleForPublication({
      make: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      mileageKm: vehicle.mileage,
      priceCents: vehicle.selling_price === null ? null : Math.round(vehicle.selling_price * 100),
      description: vehicle.description,
      photos: Array.from({ length: photoCount ?? 0 }, (_, index) => ({
        id: String(index), path: "", url: "", alt: "", position: index,
        isCover: index === 0, width: null, height: null,
      })),
    })
    if (!validation.canPublish) {
      return {
        success: false,
        message: `Publication impossible. À compléter : ${validation.missingFields.join(", ")}.`,
      }
    }
  }

  const now = new Date().toISOString()
  const becomesPrivate = ["SOLD", "DELIVERED", "ARCHIVED", "CANCELLED"]
    .includes(parsed.data.nextStatus)
  const publicationUpdate = parsed.data.nextStatus === "PUBLISHED"
    ? { publication_status: "PUBLISHED", published_at: vehicle.published_at ?? now }
    : becomesPrivate
      ? { publication_status: "UNPUBLISHED" }
      : {}
  const { data: updatedVehicle, error: updateError } = await supabase
    .from("vehicles")
    .update({ status: parsed.data.nextStatus, updated_at: now, ...publicationUpdate })
    .eq("id", parsed.data.vehicleId)
    .eq("status", currentStatus.data)
    .select("id")
    .maybeSingle()
  if (updateError || !updatedVehicle) {
    return {
      success: false,
      message: updateError?.message ?? "Le statut a été modifié entre-temps.",
    }
  }

  const { error: eventError } = await supabase.from("vehicle_events").insert({
    vehicle_id: parsed.data.vehicleId,
    type: parsed.data.nextStatus,
    description: getStatusEventDescription(currentStatus.data, parsed.data.nextStatus),
    metadata: {
      changed_by: user.id,
      previous_status: currentStatus.data,
      new_status: parsed.data.nextStatus,
    },
  })

  let warning: string | undefined
  if (eventError) {
    console.error("Unable to create vehicle status event", {
      vehicleId: parsed.data.vehicleId,
      code: eventError.code,
      message: eventError.message,
    })
    warning = "Le statut a été modifié, mais la timeline n'a pas pu être mise à jour."
  }

  revalidatePath(`/stock/${parsed.data.vehicleId}`)
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  const { data: garage } = await supabase
    .from("garages")
    .select("live_slug")
    .eq("id", vehicle.garage_id)
    .maybeSingle()
  if (garage?.live_slug) {
    revalidateGarageLive({
      garageSlug: garage.live_slug,
      vehicleSlug: vehicle.live_slug,
    })
  }
  return { success: true, message: "Statut mis à jour.", warning }
}

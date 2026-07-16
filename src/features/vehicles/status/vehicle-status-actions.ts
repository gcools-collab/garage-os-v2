"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
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
    .select("id, status")
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

  const { data: updatedVehicle, error: updateError } = await supabase
    .from("vehicles")
    .update({ status: parsed.data.nextStatus, updated_at: new Date().toISOString() })
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
  return { success: true, message: "Statut mis à jour.", warning }
}

"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  type VehicleActionState,
  type VehicleInput,
  parseVehicleFormData,
} from "./schema"

function toVehicleRow(vehicle: VehicleInput) {
  return {
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    mileage: vehicle.mileage,
    purchase_price: vehicle.purchasePrice,
    vin: vehicle.vin ?? null,
    registration_number: vehicle.registrationNumber ?? null,
    color: vehicle.color ?? null,
    doors: vehicle.doors ?? null,
    seats: vehicle.seats ?? null,
    power_din: vehicle.powerDin ?? null,
    fiscal_power: vehicle.fiscalPower ?? null,
    co2_emissions: vehicle.co2Emissions ?? null,
    crit_air: vehicle.critAir ?? null,
    euro_standard: vehicle.euroStandard ?? null,
    trim: vehicle.trim ?? null,
    engine: vehicle.engine ?? null,
    fuel: vehicle.fuel ?? null,
    gearbox: vehicle.gearbox ?? null,
    transmission: vehicle.transmission ?? null,
    owners_count: vehicle.ownersCount ?? null,
    first_registration_date: vehicle.firstRegistrationDate ?? null,
  }
}

function validationFailure(
  result: Exclude<ReturnType<typeof parseVehicleFormData>, { success: true }>
): VehicleActionState {
  return {
    success: false,
    message: "Vérifie les informations du véhicule.",
    errors: result.error.flatten().fieldErrors,
  }
}

export async function createVehicle(
  _previousState: VehicleActionState,
  formData: FormData
): Promise<VehicleActionState> {
  const parsed = parseVehicleFormData(formData)

  if (!parsed.success) {
    return validationFailure(parsed)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "Non authentifié." }
  }

  const { data: member, error: memberError } = await supabase
    .from("garage_members")
    .select("garage_id")
    .eq("user_id", user.id)
    .single()

  if (memberError || !member) {
    return { success: false, message: "Garage introuvable." }
  }

  const { error } = await supabase.from("vehicles").insert({
    garage_id: member.garage_id,
    ...toVehicleRow(parsed.data),
    status: "PURCHASED",
  })

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath("/stock")
  return { success: true, message: "Véhicule ajouté." }
}

export async function updateVehicle(
  vehicleId: string,
  _previousState: VehicleActionState,
  formData: FormData
): Promise<VehicleActionState> {
  const parsed = parseVehicleFormData(formData)

  if (!parsed.success) {
    return validationFailure(parsed)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, message: "Non authentifié." }
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .single()

  if (vehicleError || !vehicle) {
    return { success: false, message: "Véhicule introuvable ou inaccessible." }
  }

  const { error } = await supabase
    .from("vehicles")
    .update({
      ...toVehicleRow(parsed.data),
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath("/stock")
  revalidatePath(`/stock/${vehicleId}`)
  return { success: true, message: "Informations mises à jour." }
}

"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { parseVehicleCostFormData, type VehicleCostInput } from "./cost-schema"
import type { VehicleCostActionState } from "./cost-state"

const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
})

function validationFailure(
  result: Exclude<ReturnType<typeof parseVehicleCostFormData>, { success: true }>
): VehicleCostActionState {
  return {
    success: false,
    message: "Vérifie les informations du coût.",
    errors: result.error.flatten().fieldErrors,
  }
}

function toCostRow(input: VehicleCostInput) {
  return {
    type: input.type,
    label: input.label,
    amount: input.amount,
    incurred_at: input.incurredAt,
    notes: input.notes ?? null,
  }
}

async function addCostEvent(
  vehicleId: string,
  description: string
): Promise<string | undefined> {
  const supabase = await createClient()
  const { error } = await supabase.from("vehicle_events").insert({
    vehicle_id: vehicleId,
    type: "MODIFIED",
    description,
  })

  if (!error) return undefined

  console.error("Unable to create vehicle cost event", {
    vehicleId,
    code: error.code,
    message: error.message,
  })
  return "Le coût a été enregistré, mais la timeline n'a pas pu être mise à jour."
}

function revalidateVehicle(vehicleId: string) {
  revalidatePath(`/stock/${vehicleId}`)
  revalidatePath("/stock")
  revalidatePath("/dashboard")
}

export async function createVehicleCost(
  vehicleId: string,
  _previousState: VehicleCostActionState,
  formData: FormData
): Promise<VehicleCostActionState> {
  const parsed = parseVehicleCostFormData(formData)
  if (!parsed.success) return validationFailure(parsed)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Non authentifié." }

  const { error } = await supabase.from("vehicle_costs").insert({
    vehicle_id: vehicleId,
    ...toCostRow(parsed.data),
  })
  if (error) return { success: false, message: error.message }

  const warning = await addCostEvent(
    vehicleId,
    `Coût ajouté : ${parsed.data.label} — ${currency.format(parsed.data.amount)}`
  )
  revalidateVehicle(vehicleId)
  return { success: true, message: "Coût ajouté.", warning }
}

export async function updateVehicleCost(
  costId: string,
  vehicleId: string,
  _previousState: VehicleCostActionState,
  formData: FormData
): Promise<VehicleCostActionState> {
  const parsed = parseVehicleCostFormData(formData)
  if (!parsed.success) return validationFailure(parsed)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Non authentifié." }

  const { data, error } = await supabase
    .from("vehicle_costs")
    .update(toCostRow(parsed.data))
    .eq("id", costId)
    .eq("vehicle_id", vehicleId)
    .select("id")
    .maybeSingle()
  if (error || !data) {
    return { success: false, message: error?.message ?? "Coût introuvable." }
  }

  const warning = await addCostEvent(
    vehicleId,
    `Coût modifié : ${parsed.data.label} — ${currency.format(parsed.data.amount)}`
  )
  revalidateVehicle(vehicleId)
  return { success: true, message: "Coût modifié.", warning }
}

export async function deleteVehicleCost(
  costId: string,
  vehicleId: string
): Promise<VehicleCostActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Non authentifié." }

  const { data: cost, error: readError } = await supabase
    .from("vehicle_costs")
    .select("label, amount")
    .eq("id", costId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle()
  if (readError || !cost) {
    return { success: false, message: readError?.message ?? "Coût introuvable." }
  }

  const { error } = await supabase
    .from("vehicle_costs")
    .delete()
    .eq("id", costId)
    .eq("vehicle_id", vehicleId)
  if (error) return { success: false, message: error.message }

  const warning = await addCostEvent(
    vehicleId,
    `Coût supprimé : ${cost.label} — ${currency.format(Number(cost.amount))}`
  )
  revalidateVehicle(vehicleId)
  return { success: true, message: "Coût supprimé.", warning }
}

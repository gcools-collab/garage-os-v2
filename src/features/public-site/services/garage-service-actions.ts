"use server"

import { revalidatePath } from "next/cache"

import { getActiveGarageSession } from "@/features/tenant"
import { garageServiceUpdateSchema, type GarageServiceUpdateInput, type GarageServiceUpdateResult } from "./garage-service-settings"
import { saveGarageServiceConfiguration } from "./garage-service-repository"

export async function updateActiveGarageServices(input: GarageServiceUpdateInput): Promise<GarageServiceUpdateResult> {
  const session = await getActiveGarageSession()
  if (!session?.garageId || !session.garageSlug) return { success: false, message: "Aucun garage actif." }
  if (session.memberRole !== "owner" && session.memberRole !== "admin") {
    return { success: false, message: "Seuls les propriétaires et administrateurs peuvent modifier ces services." }
  }
  const parsed = garageServiceUpdateSchema.safeParse(input)
  if (!parsed.success) return { success: false, message: "La configuration des services est invalide." }
  const saved = await saveGarageServiceConfiguration(session.garageId, parsed.data)
  if (!saved.success) return { success: false, message: "Impossible d’enregistrer les services publics." }
  for (const path of [
    "/settings/services", `/g/${session.garageSlug}`, `/g/${session.garageSlug}/services`,
    `/g/${session.garageSlug}/location`, `/g/${session.garageSlug}/depot-vente`,
    `/g/${session.garageSlug}/contact`, `/g/${session.garageSlug}/stock`, "/sitemap.xml",
  ]) revalidatePath(path)
  return { success: true, message: "Services publics enregistrés." }
}


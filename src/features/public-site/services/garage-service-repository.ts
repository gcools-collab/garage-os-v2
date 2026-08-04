import "server-only"

import { createClient } from "@/lib/supabase/server"
import { isPublicServiceId, type GarageServiceConfiguration } from "./public-services"
import type { GarageServiceUpdateInput } from "./garage-service-settings"

type GarageServiceRow = {
  readonly service_key: unknown
  readonly is_enabled: boolean
  readonly public_title: string | null
  readonly public_description: string | null
  readonly public_cta_label: string | null
  readonly display_order: number
}

function mapRow(row: GarageServiceRow): GarageServiceConfiguration | null {
  if (!isPublicServiceId(row.service_key)) return null
  return {
    serviceKey: row.service_key,
    status: row.is_enabled ? "ENABLED" : "DISABLED",
    publicTitle: row.public_title,
    publicDescription: row.public_description,
    publicCtaLabel: row.public_cta_label,
    displayOrder: row.display_order,
  }
}

export async function loadGarageServiceConfiguration(garageId: string) {
  const { data, error } = await (await createClient()).from("garage_services")
    .select("service_key,is_enabled,public_title,public_description,public_cta_label,display_order")
    .eq("garage_id", garageId)
    .order("display_order")
  if (error) throw new Error(`Impossible de charger les services du garage (${error.code}).`)
  return ((data ?? []) as GarageServiceRow[]).map(mapRow).filter((item): item is GarageServiceConfiguration => item !== null)
}

export async function saveGarageServiceConfiguration(garageId: string, input: GarageServiceUpdateInput) {
  const { error } = await (await createClient()).from("garage_services").upsert(
    input.services.map((service) => ({
      garage_id: garageId,
      service_key: service.serviceKey,
      is_enabled: service.status === "ENABLED",
      public_title: service.publicTitle,
      public_description: service.publicDescription,
      public_cta_label: service.publicCtaLabel,
      display_order: service.displayOrder,
    })),
    { onConflict: "garage_id,service_key" },
  )
  if (error) return { success: false as const, error: error.message }
  return { success: true as const }
}


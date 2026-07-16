"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  buildMarketplaceRefreshPlan,
  requireAccessibleMarketplaceLink,
} from "./marketplace-link-refresh"
import { createVehicleAcquisitionService } from "./service-factory"
import type { DraftVehicle } from "./types"

const linkIdSchema = z.uuid()

type MarketplaceLinkRow = {
  id: string
  vehicle_id: string
  url: string
  published_at: string | null
  vehicles: {
    id: string
    status: string
    selling_price: number | string | null
  } | null
}

export type RefreshMarketplaceLinkResult = {
  success: boolean
  message: string
  observedAt?: string
}

export async function refreshMarketplaceLink(
  linkId: string
): Promise<RefreshMarketplaceLinkResult> {
  const parsedLinkId = linkIdSchema.safeParse(linkId)
  if (!parsedLinkId.success) {
    return { success: false, message: "Lien marketplace invalide." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Utilisateur non authentifié." }

  const { data, error: linkError } = await supabase
    .from("marketplace_links")
    .select("id, vehicle_id, url, published_at, vehicles(id, status, selling_price)")
    .eq("id", parsedLinkId.data)
    .maybeSingle()
  let link: MarketplaceLinkRow
  try {
    link = requireAccessibleMarketplaceLink(
      linkError ? null : (data as MarketplaceLinkRow | null)
    )
  } catch {
    return { success: false, message: "Annonce introuvable ou inaccessible." }
  }
  if (!link.vehicles) {
    return { success: false, message: "Annonce introuvable ou inaccessible." }
  }

  let draft: DraftVehicle
  try {
    draft = await createVehicleAcquisitionService().acquire(link.url)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? `Actualisation impossible : ${error.message}`
          : "Actualisation impossible : l'annonce est inaccessible.",
    }
  }

  const observedAt = new Date()
  const plan = buildMarketplaceRefreshPlan(
    {
      publishedAt: link.published_at,
      vehicleStatus: link.vehicles.status,
      vehicleSellingPrice: link.vehicles.selling_price,
    },
    draft,
    observedAt
  )

  const { error: updateLinkError } = await supabase
    .from("marketplace_links")
    .update(plan.link)
    .eq("id", link.id)
  if (updateLinkError) {
    return { success: false, message: updateLinkError.message }
  }

  if (plan.vehicleSellingPrice !== null) {
    const { error } = await supabase
      .from("vehicles")
      .update({ selling_price: plan.vehicleSellingPrice })
      .eq("id", link.vehicle_id)
      .is("selling_price", null)
    if (error) return { success: false, message: error.message }
  }

  if (plan.publishVehicle) {
    const { data: publishedVehicle, error } = await supabase
      .from("vehicles")
      .update({ status: "PUBLISHED", updated_at: observedAt.toISOString() })
      .eq("id", link.vehicle_id)
      .eq("status", "PURCHASED")
      .select("id")
      .maybeSingle()
    if (error) return { success: false, message: error.message }

    if (publishedVehicle) {
      const { error: eventError } = await supabase.from("vehicle_events").insert({
        vehicle_id: link.vehicle_id,
        type: "PUBLISHED",
        description: "Statut changé après actualisation d'une annonce active : Acheté → Publié",
        metadata: {
          changed_by: user.id,
          previous_status: "PURCHASED",
          new_status: "PUBLISHED",
          source: "marketplace_refresh",
        },
      })
      if (eventError) {
        console.error("Unable to create marketplace refresh status event", {
          linkId: link.id,
          code: eventError.code,
          message: eventError.message,
        })
      }
    }
  }

  revalidatePath(`/stock/${link.vehicle_id}`)
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  return {
    success: true,
    message: "Annonce actualisée.",
    observedAt: observedAt.toISOString(),
  }
}

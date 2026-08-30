import "server-only"

import {
  getActiveGarageBranding,
  getActiveGarageBrandingMedia,
} from "@/features/branding"
import {
  mapPublicVehicle,
  type PublicGarageContext,
  type PublicVehicleImageRecord,
  type PublicVehicleRecord,
} from "@/features/live-stock"
import { getActiveGarageSession } from "@/features/tenant"
import { resolveLiveTheme } from "@/features/theme"
import { createClient } from "@/lib/supabase/server"
import type { PublicationWorkspaceSource } from "../types"
import { Vehicle360PublicationBuilder } from "@/features/vehicle-360"
import { getVehicle360Sequence } from "@/features/vehicle-360/repositories"
import { buildDeterministicMediaQualityReport } from "@/features/media-quality"
import { InteriorTourPublicationBuilder } from "@/features/interior-tour"
import { getInteriorTour } from "@/features/interior-tour/repositories"

const VEHICLE_COLUMNS = [
  "id", "garage_id", "live_slug", "brand", "model", "version", "year",
  "mileage", "fuel", "gearbox", "body_type", "stock_category", "power_din", "fiscal_power",
  "doors", "seats", "color", "first_registration_date", "selling_price",
  "description", "status", "publication_status", "published_at", "created_at",
  "updated_at", "co2_emissions", "crit_air", "euro_standard", "owners_count",
].join(",")

function formatAddress(branding: NonNullable<
  Awaited<ReturnType<typeof getActiveGarageBranding>>
>["branding"]) {
  return [
    branding.address.line1,
    branding.address.line2,
    [branding.address.postalCode, branding.address.city].filter(Boolean).join(" "),
  ].filter(Boolean).join(", ") || null
}

export async function getPublicationWorkspaceSource(
  vehicleId: string
): Promise<PublicationWorkspaceSource | null> {
  const session = await getActiveGarageSession()
  if (!session?.garageId || !session.garageName || !session.garageSlug) return null
  const supabase = await createClient()
  const [{ data: vehicle, error: vehicleError }, { data: garage, error: garageError }] =
    await Promise.all([
      supabase.from("vehicles").select(VEHICLE_COLUMNS)
        .eq("id", vehicleId).eq("garage_id", session.garageId).maybeSingle(),
      supabase.from("garages").select("id, live_slug, live_enabled")
        .eq("id", session.garageId).maybeSingle(),
    ])
  if (vehicleError || garageError) {
    throw new Error("Impossible de charger l’espace de publication.")
  }
  if (!vehicle || !garage) return null

  const [{ data: images, error: imageError }, activeBranding, brandingMedia] =
    await Promise.all([
      supabase.from("vehicle_images")
        .select("id, vehicle_id, garage_id, storage_path, is_primary, created_at")
        .eq("vehicle_id", vehicleId).eq("garage_id", session.garageId)
        .order("created_at", { ascending: true }),
      getActiveGarageBranding(),
      getActiveGarageBrandingMedia(),
    ])
  if (imageError || !activeBranding) {
    throw new Error("Impossible de préparer l’aperçu de publication.")
  }

  const branding = activeBranding.branding
  const garageContext: PublicGarageContext = {
    garageId: session.garageId,
    garageSlug: garage.live_slug ?? session.garageSlug,
    displayName: branding.displayName,
    status: garage.live_enabled ? "ACTIVE" : "DISABLED",
    basePath: `/g/${encodeURIComponent(garage.live_slug ?? session.garageSlug)}`,
    liveTheme: resolveLiveTheme({
      themeKey: branding.themeKey,
      colors: branding.colors,
    }),
    branding: {
      displayName: branding.displayName,
      legalName: branding.legalName,
      logoUrl: brandingMedia?.logoUrl ?? null,
      faviconUrl: brandingMedia?.faviconUrl ?? null,
      phone: branding.contact.phone,
      formattedPhone: branding.contact.phone,
      email: branding.contact.email,
      formattedAddress: formatAddress(branding),
      shortDescription: branding.shortDescription,
      socialLinks: branding.socialLinks,
      themeKey: branding.themeKey,
      colors: branding.colors,
    },
  }

  const vehicle360 = new Vehicle360PublicationBuilder().build(
    await getVehicle360Sequence(vehicleId),
    vehicleId
  )
  const interiorTour = new InteriorTourPublicationBuilder().build(
    await getInteriorTour(vehicleId),
    vehicleId
  )
  const mappedVehicle = mapPublicVehicle(
    vehicle as unknown as PublicVehicleRecord,
    (images ?? []) as unknown as PublicVehicleImageRecord[]
  )
  const mediaQuality = buildDeterministicMediaQualityReport(mappedVehicle.photos.map((photo, index) => ({
    id: photo.id, position: index + 1, url: photo.url, width: null, height: null,
    fileSize: null, mimeType: "image/unknown", hash: null, ready: true,
  })))

  return {
    garage: garageContext,
    vehicle: mappedVehicle,
    garageActive: Boolean(garage.live_enabled),
    brandingConfigured: Boolean(
      branding.displayName.trim()
      && (branding.contact.phone || branding.contact.email)
    ),
    vehicle360,
    interiorTour,
    mediaQuality,
  }
}

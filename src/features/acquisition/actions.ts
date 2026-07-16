"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { LeboncoinAcquisitionProvider } from "./providers/leboncoin-provider"
import {
  acquisitionDetailsSchema,
  acquisitionUrlSchema,
  draftVehicleSchema,
  editableDraftVehicleSchema,
} from "./schema"
import type { AcquisitionActionState } from "./state"
import type { DraftVehicle } from "./types"
import { VehicleAcquisitionService } from "./vehicle-acquisition-service"

const MAX_IMAGE_SIZE = 10 * 1024 * 1024
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

function getService() {
  const bridgeUrl = process.env.LEBONCOIN_BRIDGE_URL
  const apiKey = process.env.LEBONCOIN_BRIDGE_API_KEY

  if (!bridgeUrl || !apiKey) {
    throw new Error("Le bridge Leboncoin n'est pas configuré.")
  }

  return new VehicleAcquisitionService([
    new LeboncoinAcquisitionProvider(bridgeUrl, apiKey),
  ])
}

export async function previewAcquiredVehicle(
  _previousState: AcquisitionActionState,
  formData: FormData
): Promise<AcquisitionActionState> {
  const parsedUrl = acquisitionUrlSchema.safeParse(formData.get("url"))
  if (!parsedUrl.success) {
    return {
      success: false,
      message: "Vérifie l'URL de l'annonce.",
      errors: { url: parsedUrl.error.issues.map((issue) => issue.message) },
    }
  }

  try {
    const draft = await getService().acquire(parsedUrl.data)
    const parsedDraft = draftVehicleSchema.safeParse(draft)
    if (!parsedDraft.success) {
      return {
        success: false,
        message: "L'annonce ne contient pas les informations minimales requises.",
      }
    }

    return { success: true, draft: parsedDraft.data }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Impossible de récupérer cette annonce.",
    }
  }
}

async function importPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  garageId: string,
  vehicleId: string,
  photoUrl: string,
  isPrimary: boolean
) {
  const url = new URL(photoUrl)
  const hostname = url.hostname.toLowerCase()
  if (
    url.protocol !== "https:" ||
    (hostname !== "leboncoin.fr" && !hostname.endsWith(".leboncoin.fr"))
  ) {
    throw new Error("Hôte d'image non autorisé.")
  }

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error("Téléchargement de l'image impossible.")

  const contentType = response.headers.get("content-type")?.split(";")[0] ?? ""
  const extension = IMAGE_TYPES.get(contentType)
  if (!extension) throw new Error("Format d'image non pris en charge.")

  const announcedSize = Number(response.headers.get("content-length") ?? 0)
  if (announcedSize > MAX_IMAGE_SIZE) throw new Error("Image trop volumineuse.")

  const image = await response.arrayBuffer()
  if (image.byteLength > MAX_IMAGE_SIZE) throw new Error("Image trop volumineuse.")

  const storagePath = `${garageId}/${vehicleId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from("vehicle-images")
    .upload(storagePath, image, { contentType, upsert: false })
  if (uploadError) throw new Error(uploadError.message)

  const {
    data: { publicUrl },
  } = supabase.storage.from("vehicle-images").getPublicUrl(storagePath)
  const { error: imageError } = await supabase.from("vehicle_images").insert({
    vehicle_id: vehicleId,
    storage_path: storagePath,
    url: publicUrl,
    type: "UNCLASSIFIED",
    is_primary: isPrimary,
  })

  if (imageError) {
    await supabase.storage.from("vehicle-images").remove([storagePath])
    throw new Error(imageError.message)
  }
}

export async function createAcquiredVehicle(
  draft: DraftVehicle,
  _previousState: AcquisitionActionState,
  formData: FormData
): Promise<AcquisitionActionState> {
  const parsedDraft = editableDraftVehicleSchema.safeParse(draft)
  const parsedDetails = acquisitionDetailsSchema.safeParse({
    garageId: formData.get("garageId"),
    purchasePrice: formData.get("purchasePrice"),
    sellingPrice: formData.get("sellingPrice"),
    notes: formData.get("notes") ?? "",
  })

  if (!parsedDraft.success || !parsedDetails.success) {
    return {
      success: false,
      draft,
      message: "Vérifie les informations métier.",
      errors: parsedDetails.success
        ? undefined
        : parsedDetails.error.flatten().fieldErrors,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, draft, message: "Non authentifié." }

  const { data: membership } = await supabase
    .from("garage_members")
    .select("garage_id")
    .eq("user_id", user.id)
    .eq("garage_id", parsedDetails.data.garageId)
    .maybeSingle()
  if (!membership) {
    return { success: false, draft, message: "Garage introuvable ou inaccessible." }
  }

  const vehicle = parsedDraft.data
  const publishedAt =
    vehicle.publishedAt && !Number.isNaN(Date.parse(vehicle.publishedAt))
      ? new Date(vehicle.publishedAt).toISOString()
      : null
  const { data: vehicleId, error } = await supabase.rpc("create_acquired_vehicle", {
    p_garage_id: parsedDetails.data.garageId,
    p_brand: vehicle.brand,
    p_model: vehicle.model,
    p_year: vehicle.year,
    p_mileage: vehicle.mileage,
    p_purchase_price: parsedDetails.data.purchasePrice,
    p_selling_price: parsedDetails.data.sellingPrice,
    p_description: vehicle.description,
    p_notes: parsedDetails.data.notes || null,
    p_trim: vehicle.trim,
    p_fuel: vehicle.characteristics.fuel,
    p_gearbox: vehicle.characteristics.gearbox,
    p_power_din: vehicle.characteristics.powerDin,
    p_fiscal_power: vehicle.characteristics.fiscalPower,
    p_color: vehicle.characteristics.color,
    p_doors: vehicle.characteristics.doors,
    p_seats: vehicle.characteristics.seats,
    p_first_registration_date: vehicle.characteristics.firstRegistrationDate,
    p_body_type: vehicle.characteristics.bodyType,
    p_upholstery: vehicle.characteristics.upholstery,
    p_crit_air: vehicle.characteristics.critAir,
    p_provider: vehicle.provider,
    p_url: vehicle.sourceUrl,
    p_external_id: vehicle.externalId,
    p_published_at: publishedAt,
  })

  if (error || typeof vehicleId !== "string") {
    return {
      success: false,
      draft,
      message: error?.message ?? "Impossible de créer le véhicule.",
    }
  }

  let importedPhotos = 0
  for (const photo of vehicle.photos) {
    try {
      await importPhoto(
        supabase,
        parsedDetails.data.garageId,
        vehicleId,
        photo,
        importedPhotos === 0
      )
      importedPhotos += 1
    } catch {
      // Une photo distante indisponible ne doit pas annuler le véhicule déjà créé.
    }
  }

  revalidatePath("/stock")
  revalidatePath(`/stock/${vehicleId}`)
  return {
    success: true,
    vehicleId,
    message:
      importedPhotos === vehicle.photos.length
        ? "Véhicule importé."
        : `Véhicule importé avec ${importedPhotos} photo(s) sur ${vehicle.photos.length}.`,
  }
}

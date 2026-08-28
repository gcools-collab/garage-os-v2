"use server"

import { revalidatePath } from "next/cache"
import { revalidateVehicleLiveById } from "@/features/live-stock"
import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { vehicleImageCategorySchema } from "./image-category"

export type VehicleImageUploadResult =
  | { readonly ok: true; readonly uploaded: number }
  | { readonly ok: false; readonly message: string }

async function assertVehicleAccess(vehicleId: string) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) {
    throw new Error("Session garage invalide.")
  }
  const supabase = await createClient()
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .select("id, garage_id")
    .eq("id", vehicleId)
    .eq("garage_id", session.garageId)
    .maybeSingle()
  if (error || !vehicle) {
    throw new Error("Véhicule introuvable ou inaccessible.")
  }
  return { supabase, vehicle, session }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES_PER_UPLOAD = 10
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export async function uploadVehicleImages(formData: FormData): Promise<VehicleImageUploadResult> {
  const vehicleId = String(formData.get("vehicleId") ?? "")
  const files = formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0)

  if (!vehicleId) {
    return { ok: false, message: "Identifiant du véhicule manquant." }
  }

  if (files.length === 0) {
    return { ok: false, message: "Sélectionnez au moins une photo." }
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    return { ok: false, message: "Maximum 10 photos par envoi." }
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { ok: false, message: "Formats acceptés : JPEG, PNG, WebP." }
    }
    if (file.size > MAX_FILE_SIZE) {
      return { ok: false, message: "Chaque photo doit faire 10 Mo maximum." }
    }
  }

  try {
    const { supabase, vehicle } = await assertVehicleAccess(vehicleId)

    const { data: primaryImage, error: primaryImageError } = await supabase
      .from("vehicle_images")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("is_primary", true)
      .maybeSingle()

    if (primaryImageError) {
      return { ok: false, message: primaryImageError.message }
    }

    const { data: lastImage } = await supabase
      .from("vehicle_images")
      .select("display_order")
      .eq("vehicle_id", vehicleId)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextOrder = (lastImage?.display_order ?? 0) + 1
    const uploadedPaths: string[] = []
    const createdImageIds: string[] = []

    try {
      for (const [index, file] of files.entries()) {
        const extension = ALLOWED_IMAGE_TYPES.get(file.type)!
        const fileName = `${crypto.randomUUID()}.${extension}`
        const storagePath = `${vehicle.garage_id}/${vehicle.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from("vehicle-images")
          .upload(storagePath, file, { contentType: file.type, upsert: false })

        if (uploadError) {
          throw new Error(uploadError.message)
        }

        uploadedPaths.push(storagePath)

        const {
          data: { publicUrl },
        } = supabase.storage.from("vehicle-images").getPublicUrl(storagePath)

        const { data: image, error: databaseError } = await supabase
          .from("vehicle_images")
          .insert({
            vehicle_id: vehicleId,
            storage_path: storagePath,
            url: publicUrl,
            type: "UNCLASSIFIED",
            is_primary: !primaryImage && index === 0,
            display_order: nextOrder,
          })
          .select("id")
          .single()

        if (databaseError || !image) {
          throw new Error(databaseError?.message ?? "Impossible d'enregistrer la photo.")
        }

        createdImageIds.push(image.id)
        nextOrder += 1
      }
    } catch (error) {
      if (createdImageIds.length > 0) {
        await supabase.from("vehicle_images").delete().in("id", createdImageIds)
      }
      if (uploadedPaths.length > 0) {
        await supabase.storage.from("vehicle-images").remove(uploadedPaths)
      }
      throw error
    }

    revalidatePath(`/stock/${vehicleId}`)
    await revalidateVehicleLiveById(vehicleId)
    return { ok: true, uploaded: files.length }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Échec de l'import des photos.",
    }
  }
}

export async function reorderVehicleImage(
  vehicleId: string,
  imageId: string,
  direction: -1 | 1,
): Promise<{ readonly ok: boolean; readonly message?: string }> {
  if (!vehicleId || !imageId) {
    return { ok: false, message: "Paramètres invalides." }
  }
  try {
    const { supabase } = await assertVehicleAccess(vehicleId)
    const { data: images, error } = await supabase
      .from("vehicle_images")
      .select("id, display_order")
      .eq("vehicle_id", vehicleId)
      .order("display_order", { ascending: true })
      .order("id", { ascending: true })

    if (error || !images?.length) {
      return { ok: false, message: error?.message ?? "Aucune photo à réordonner." }
    }

    const index = images.findIndex((image) => image.id === imageId)
    if (index < 0) return { ok: false, message: "Photo introuvable." }
    const target = index + direction
    if (target < 0 || target >= images.length) return { ok: true }

    const reordered = [...images]
    const [item] = reordered.splice(index, 1)
    reordered.splice(target, 0, item)

    const { error: reorderError } = await supabase.rpc("reorder_vehicle_images", {
      p_vehicle_id: vehicleId,
      p_image_ids: reordered.map((image) => image.id),
    })
    if (reorderError) return { ok: false, message: reorderError.message }

    revalidatePath(`/stock/${vehicleId}`)
    await revalidateVehicleLiveById(vehicleId)
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Réordonnancement impossible.",
    }
  }
}

export async function setVehiclePrimaryImage(formData: FormData) {
  const supabase = await createClient()
  const imageId = String(formData.get("imageId") ?? "")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Utilisateur non authentifié.")
  }

  if (!imageId) {
    throw new Error("Identifiant de l'image manquant.")
  }

  const { data: image, error: imageError } = await supabase
    .from("vehicle_images")
    .select("vehicle_id")
    .eq("id", imageId)
    .single()

  if (imageError || !image) {
    throw new Error("Image introuvable ou inaccessible.")
  }

  await assertVehicleAccess(image.vehicle_id)

  const { error } = await supabase.rpc("set_vehicle_primary_image", {
    p_image_id: imageId,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/stock/${image.vehicle_id}`)
  await revalidateVehicleLiveById(image.vehicle_id)
}

export async function deleteVehicleImage(formData: FormData) {
  const supabase = await createClient()
  const imageId = String(formData.get("imageId") ?? "")
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Utilisateur non authentifié.")
  }

  if (!imageId) {
    throw new Error("Identifiant de l'image manquant.")
  }

  const { data: image, error: imageError } = await supabase
    .from("vehicle_images")
    .select("vehicle_id, storage_path")
    .eq("id", imageId)
    .single()

  if (imageError || !image) {
    throw new Error("Image introuvable ou inaccessible.")
  }

  await assertVehicleAccess(image.vehicle_id)

  const { error: databaseError } = await supabase
    .from("vehicle_images")
    .delete()
    .eq("id", imageId)

  if (databaseError) {
    throw new Error(databaseError.message)
  }

  const { error: storageError } = await supabase.storage
    .from("vehicle-images")
    .remove([image.storage_path])

  revalidatePath(`/stock/${image.vehicle_id}`)
  await revalidateVehicleLiveById(image.vehicle_id)

  if (storageError) {
    throw new Error(storageError.message)
  }
}

export async function updateVehicleImageCategory(
  imageId: string,
  category: string
): Promise<{ success: boolean; message?: string }> {
  const parsedCategory = vehicleImageCategorySchema.safeParse(category)
  if (!parsedCategory.success) {
    return { success: false, message: "Catégorie de photo invalide." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Utilisateur non authentifié." }

  const { data: existingImage, error: imageError } = await supabase
    .from("vehicle_images")
    .select("vehicle_id")
    .eq("id", imageId)
    .maybeSingle()

  if (imageError || !existingImage) {
    return { success: false, message: "Image introuvable ou inaccessible." }
  }

  try {
    await assertVehicleAccess(existingImage.vehicle_id)
  } catch {
    return { success: false, message: "Image introuvable ou inaccessible." }
  }

  const { data: image, error } = await supabase
    .from("vehicle_images")
    .update({ type: parsedCategory.data })
    .eq("id", imageId)
    .eq("vehicle_id", existingImage.vehicle_id)
    .select("vehicle_id")
    .maybeSingle()

  if (error || !image) {
    return {
      success: false,
      message: error?.message ?? "Image introuvable ou inaccessible.",
    }
  }

  revalidatePath(`/stock/${image.vehicle_id}`)
  await revalidateVehicleLiveById(image.vehicle_id)
  return { success: true }
}

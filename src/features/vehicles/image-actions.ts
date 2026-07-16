"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILES_PER_UPLOAD = 10
const ALLOWED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
])

export async function uploadVehicleImages(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Utilisateur non authentifié.")
  }

  const vehicleId = String(formData.get("vehicleId") ?? "")
  const files = formData
    .getAll("images")
    .filter((file): file is File => file instanceof File && file.size > 0)

  if (!vehicleId) {
    throw new Error("Identifiant du véhicule manquant.")
  }

  if (files.length === 0) {
    throw new Error("Sélectionne au moins une image.")
  }

  if (files.length > MAX_FILES_PER_UPLOAD) {
    throw new Error("Tu peux importer au maximum 10 images à la fois.")
  }

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error("Seuls les fichiers JPEG, PNG et WebP sont acceptés.")
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Chaque image ne doit pas dépasser 10 Mo.")
    }
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from("vehicles")
    .select("id, garage_id")
    .eq("id", vehicleId)
    .single()

  if (vehicleError || !vehicle) {
    throw new Error("Véhicule introuvable ou inaccessible.")
  }

  const { data: primaryImage, error: primaryImageError } = await supabase
    .from("vehicle_images")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("is_primary", true)
    .maybeSingle()

  if (primaryImageError) {
    throw new Error(primaryImageError.message)
  }

  const uploadedPaths: string[] = []
  const createdImageIds: string[] = []

  try {
    for (const [index, file] of files.entries()) {
      const extension = ALLOWED_IMAGE_TYPES.get(file.type)!
      const fileName = `${crypto.randomUUID()}.${extension}`
      const storagePath = `${vehicle.garage_id}/${vehicle.id}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("vehicle-images")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        })

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
          type: "EXTERIOR",
          is_primary: !primaryImage && index === 0,
        })
        .select("id")
        .single()

      if (databaseError || !image) {
        throw new Error(
          databaseError?.message ?? "Impossible d'enregistrer l'image."
        )
      }

      createdImageIds.push(image.id)
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

  const { error } = await supabase.rpc("set_vehicle_primary_image", {
    p_image_id: imageId,
  })

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/stock/${image.vehicle_id}`)
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

  if (storageError) {
    throw new Error(storageError.message)
  }
}

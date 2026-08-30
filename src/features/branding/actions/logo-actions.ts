"use server"

import { revalidatePath } from "next/cache"

import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import {
  persistGarageLogoPath,
  publicMediaUrl,
  removeGarageLogoObject,
  replaceGarageLogoObject,
} from "../data"
import { removeGarageLogoWithDependencies } from "../data/remove-garage-logo"
import { uploadGarageLogoWithDependencies } from "../data/upload-garage-logo"
import type { GarageLogoActionResult } from "../types"

export async function uploadGarageLogo(formData: FormData): Promise<GarageLogoActionResult> {
  const supabase = await createClient()
  const result = await uploadGarageLogoWithDependencies(formData, {
    getSession: getActiveGarageSession,
    replaceLogoObject: (garageId, file, extension) => replaceGarageLogoObject(supabase, garageId, file, extension),
    persistLogoPath: (garageId, garageName, logoPath) =>
      persistGarageLogoPath(supabase, garageId, garageName, logoPath),
    buildPublicUrl: (garageId, path) => publicMediaUrl(supabase, garageId, path),
  })

  if (result.success) {
    revalidatePath("/", "layout")
    revalidatePath("/settings/branding")
    revalidatePath("/dashboard")
  }
  return result
}

export async function removeGarageLogo(): Promise<GarageLogoActionResult> {
  const supabase = await createClient()
  const result = await removeGarageLogoWithDependencies({
    getSession: getActiveGarageSession,
    getCurrentLogoPath: async (garageId) => {
      const { data } = await supabase
        .from("garage_branding")
        .select("logo_path")
        .eq("garage_id", garageId)
        .maybeSingle()
      return data?.logo_path ?? null
    },
    removeLogoObject: (garageId, logoPath) => removeGarageLogoObject(supabase, garageId, logoPath),
    persistLogoPath: (garageId, garageName, logoPath) =>
      persistGarageLogoPath(supabase, garageId, garageName, logoPath),
  })

  if (result.success) {
    revalidatePath("/", "layout")
    revalidatePath("/settings/branding")
    revalidatePath("/dashboard")
  }
  return result
}

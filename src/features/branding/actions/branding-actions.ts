"use server"

import { revalidatePath } from "next/cache"

import { getActiveGarageSession } from "@/features/tenant"
import {
  updateGarageBrandingWithDependencies,
  upsertActiveGarageBrandingRecord,
} from "../data"
import type { GarageBrandingUpdateInput, GarageBrandingUpdateResult } from "../types"

export async function updateActiveGarageBranding(
  input: GarageBrandingUpdateInput
): Promise<GarageBrandingUpdateResult> {
  const result = await updateGarageBrandingWithDependencies(input, {
    getSession: getActiveGarageSession,
    upsert: upsertActiveGarageBrandingRecord,
  })

  if (result.success) {
    revalidatePath("/", "layout")
    revalidatePath("/settings/branding")
    revalidatePath("/dashboard")
  }
  return result
}

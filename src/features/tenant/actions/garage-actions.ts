"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import {
  loadCurrentUserGarageMemberships,
  persistActiveGarageCookie,
  setActiveGarageWithDependencies,
} from "../data"
import type { SetActiveGarageResult } from "../types"

export async function setActiveGarage(garageId: string): Promise<SetActiveGarageResult> {
  const result = await setActiveGarageWithDependencies(garageId, {
    loadMemberships: loadCurrentUserGarageMemberships,
    persistGarageId: persistActiveGarageCookie,
  })
  if (result.success) {
    revalidatePath("/", "layout")
  }
  return result
}

export async function createFirstGarage(formData: FormData): Promise<void> {
  const parsedName = z.string().trim().min(2).max(120).safeParse(formData.get("garageName"))
  if (!parsedName.success) throw new Error("Le nom du garage doit contenir entre 2 et 120 caractères.")

  const context = await loadCurrentUserGarageMemberships()
  if (!context) redirect("/login")
  if (context.memberships.length > 0) {
    throw new Error("Un garage est déjà associé à cet utilisateur.")
  }

  const supabase = await createClient()
  const { data: garageId, error } = await supabase.rpc("create_garage_onboarding", {
    garage_name: parsedName.data,
  })
  if (error || typeof garageId !== "string") {
    console.error("Unable to create first garage", { code: error?.code, message: error?.message })
    throw new Error("Impossible de créer le garage.")
  }

  await persistActiveGarageCookie(garageId)
  redirect("/dashboard")
}

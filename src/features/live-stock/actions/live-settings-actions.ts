"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { getActiveGarageSession } from "@/features/tenant"
import { revalidateGarageLive } from "../revalidation"

const liveSettingsSchema = z.object({
  liveSlug: z.string().trim().toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(80),
  liveEnabled: z.boolean(),
})

export async function updatePublicGarageSettings(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId || session.memberRole !== "owner") return
  const parsed = liveSettingsSchema.safeParse({
    liveSlug: String(formData.get("liveSlug") ?? ""),
    liveEnabled: formData.get("liveEnabled") === "on",
  })
  if (!parsed.success) return
  const supabase = await createClient()
  const { data: current } = await supabase
    .from("garages")
    .select("live_slug")
    .eq("id", session.garageId)
    .maybeSingle()
  const { error } = await supabase
    .from("garages")
    .update({
      live_slug: parsed.data.liveSlug,
      live_enabled: parsed.data.liveEnabled,
    })
    .eq("id", session.garageId)
  if (error) throw new Error(`Mise à jour du site Live impossible (${error.code}).`)
  if (current?.live_slug) revalidateGarageLive({ garageSlug: current.live_slug })
  revalidateGarageLive({ garageSlug: parsed.data.liveSlug })
  revalidatePath("/settings/branding")
}

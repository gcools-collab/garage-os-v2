"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { getActiveGarageSession } from "@/features/tenant"

const recommendationKey = z.string().trim().min(3).max(240).regex(/^[a-z0-9:_-]+$/)

async function updateRecommendation(input: {
  readonly key: string
  readonly status: "COMPLETED" | "DISMISSED" | "SNOOZED"
  readonly snoozedUntil?: string
}) {
  const parsed = recommendationKey.safeParse(input.key)
  if (!parsed.success) return
  const session = await getActiveGarageSession()
  if (!session?.garageId || !session.memberRole) return
  const now = new Date().toISOString()
  const { error } = await (await createClient())
    .from("intelligence_recommendations")
    .update({
      status: input.status,
      dismissed_at: input.status === "DISMISSED" ? now : null,
      snoozed_until: input.status === "SNOOZED" ? input.snoozedUntil ?? null : null,
      resolved_at: null,
    })
    .eq("garage_id", session.garageId)
    .eq("recommendation_key", parsed.data)
  if (error) throw new Error(`Mise à jour de la recommandation impossible (${error.code}).`)
  revalidatePath("/dashboard")
  revalidatePath("/intelligence")
}

export async function markRecommendationCompleted(formData: FormData): Promise<void> {
  await updateRecommendation({
    key: String(formData.get("recommendationKey") ?? ""),
    status: "COMPLETED",
  })
}

export async function dismissRecommendation(formData: FormData): Promise<void> {
  await updateRecommendation({
    key: String(formData.get("recommendationKey") ?? ""),
    status: "DISMISSED",
  })
}

export async function snoozeRecommendation(formData: FormData): Promise<void> {
  const date = z.string().refine((value) => Number.isFinite(Date.parse(value))).safeParse(
    String(formData.get("snoozedUntil") ?? "")
  )
  if (!date.success || Date.parse(date.data) <= Date.now()) return
  await updateRecommendation({
    key: String(formData.get("recommendationKey") ?? ""),
    status: "SNOOZED",
    snoozedUntil: new Date(date.data).toISOString(),
  })
}

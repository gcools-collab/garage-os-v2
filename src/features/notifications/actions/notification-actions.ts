"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"

export async function markNotificationRead(formData: FormData): Promise<void> {
  const id = z.uuid().safeParse(String(formData.get("notificationId") ?? ""))
  if (!id.success) return
  const session = await getActiveGarageSession()
  if (!session?.garageId) return
  const { error } = await (await createClient())
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("garage_id", session.garageId)
    .is("read_at", null)
  if (error) throw new Error(`Mise à jour de la notification impossible (${error.code}).`)
  revalidatePath("/notifications")
  revalidatePath("/dashboard")
  revalidatePath("/commercial")
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return
  const { error } = await (await createClient())
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("garage_id", session.garageId)
    .is("read_at", null)
  if (error) throw new Error(`Mise à jour des notifications impossible (${error.code}).`)
  revalidatePath("/notifications")
  revalidatePath("/dashboard")
  revalidatePath("/commercial")
}

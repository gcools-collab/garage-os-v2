import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type { NotificationRecord } from "../types"

const COLUMNS = [
  "id", "garage_id", "user_id", "type", "title", "message", "href",
  "entity_type", "entity_id", "read_at", "dismissed_at", "created_at",
].join(",")

export async function getGarageNotifications(
  session: ActiveGarageSession,
  options: { readonly unreadOnly?: boolean; readonly limit?: number } = {}
): Promise<readonly NotificationRecord[]> {
  if (!session.garageId) return []
  let request = (await createClient())
    .from("notifications")
    .select(COLUMNS)
    .eq("garage_id", session.garageId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50)
  if (options.unreadOnly) request = request.is("read_at", null)
  const { data, error } = await request
  if (error) throw new Error(`Lecture des notifications impossible (${error.code}).`)
  return (data ?? []) as unknown as NotificationRecord[]
}

export async function getUnreadNotificationCount(session: ActiveGarageSession) {
  if (!session.garageId) return 0
  const { count, error } = await (await createClient())
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("garage_id", session.garageId)
    .is("read_at", null)
    .is("dismissed_at", null)
  if (error) throw new Error(`Comptage des notifications impossible (${error.code}).`)
  return count ?? 0
}

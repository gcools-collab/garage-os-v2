import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type {
  CommercialInboxData,
  CommercialLeadContext,
  CommercialLeadRecord,
  CommercialMemberRecord,
  CommercialTaskRecord,
  LeadNoteRecord,
} from "../types"

const LEAD_COLUMNS = [
  "id", "garage_id", "vehicle_id", "customer_name", "customer_phone",
  "customer_email", "vehicle_title_snapshot", "type", "status", "created_at",
  "first_contacted_at", "last_contacted_at", "next_action_at",
  "assigned_user_id", "preferred_date",
].join(",")

const TASK_COLUMNS = [
  "id", "garage_id", "lead_id", "vehicle_id", "assigned_user_id",
  "created_by_user_id", "type", "status", "priority", "title", "description",
  "due_at", "completed_at", "cancelled_at", "snoozed_until", "created_at", "updated_at",
].join(",")

const NOTE_COLUMNS = [
  "id", "garage_id", "lead_id", "author_user_id", "content",
  "created_at", "updated_at", "deleted_at",
].join(",")

async function getGarageMembers(
  session: ActiveGarageSession
): Promise<readonly CommercialMemberRecord[]> {
  if (!session.garageId) return []
  const supabase = await createClient()
  const { data: membershipData, error } = await supabase
    .from("garage_members")
    .select("user_id")
    .eq("garage_id", session.garageId)
  if (error) throw new Error(`Lecture des membres impossible (${error.code}).`)
  const userIds = (membershipData ?? [])
    .map((row) => typeof row.user_id === "string" ? row.user_id : null)
    .filter((id): id is string => id !== null)
  if (!userIds.length) return []
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,full_name")
    .in("id", userIds)
  if (profileError) throw new Error(`Lecture des profils impossible (${profileError.code}).`)
  const names = new Map((profiles ?? []).map((profile) => [
    profile.id as string,
    typeof profile.full_name === "string" && profile.full_name.trim()
      ? profile.full_name
      : "Membre du garage",
  ]))
  return userIds.map((userId) => ({ userId, name: names.get(userId) ?? "Membre du garage" }))
}

export async function getCommercialInboxData(
  session: ActiveGarageSession
): Promise<CommercialInboxData> {
  if (!session.garageId) return { leads: [], tasks: [], members: [] }
  const supabase = await createClient()
  const [leadResult, taskResult, members] = await Promise.all([
    supabase
      .from("leads")
      .select(LEAD_COLUMNS)
      .eq("garage_id", session.garageId)
      .not("status", "in", '("ARCHIVED")')
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("commercial_tasks")
      .select(TASK_COLUMNS)
      .eq("garage_id", session.garageId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(150),
    getGarageMembers(session),
  ])
  if (leadResult.error) throw new Error(`Lecture commerciale impossible (${leadResult.error.code}).`)
  if (taskResult.error) throw new Error(`Lecture des tâches impossible (${taskResult.error.code}).`)
  return {
    leads: (leadResult.data ?? []) as unknown as CommercialLeadRecord[],
    tasks: (taskResult.data ?? []) as unknown as CommercialTaskRecord[],
    members,
  }
}

export async function getCommercialLeadContext(
  session: ActiveGarageSession,
  leadId: string
): Promise<CommercialLeadContext> {
  if (!session.garageId) return { tasks: [], notes: [], members: [] }
  const supabase = await createClient()
  const [taskResult, noteResult, members] = await Promise.all([
    supabase
      .from("commercial_tasks")
      .select(TASK_COLUMNS)
      .eq("garage_id", session.garageId)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_notes")
      .select(NOTE_COLUMNS)
      .eq("garage_id", session.garageId)
      .eq("lead_id", leadId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    getGarageMembers(session),
  ])
  if (taskResult.error) throw new Error(`Lecture des tâches impossible (${taskResult.error.code}).`)
  if (noteResult.error) throw new Error(`Lecture des notes impossible (${noteResult.error.code}).`)
  return {
    tasks: (taskResult.data ?? []) as unknown as CommercialTaskRecord[],
    notes: (noteResult.data ?? []) as unknown as LeadNoteRecord[],
    members,
  }
}

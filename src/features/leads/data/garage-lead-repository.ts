import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type { LeadEventRecord, LeadRecord, LeadStatus, LeadType } from "../types"

export type GarageLeadQuery = {
  readonly q?: string
  readonly status?: LeadStatus
  readonly type?: LeadType
  readonly page: number
}

export type GarageLeadPage = {
  readonly leads: readonly LeadRecord[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
}

const LEAD_COLUMNS = [
  "id", "garage_id", "vehicle_id", "source", "type", "status", "customer_name",
  "customer_phone", "customer_email", "preferred_date", "preferred_time",
  "message", "public_page_url", "public_vehicle_slug", "public_garage_slug",
  "consent_contact", "consent_marketing", "vehicle_title_snapshot",
  "vehicle_price_snapshot_cents", "vehicle_brand_snapshot",
  "vehicle_model_snapshot", "vehicle_year_snapshot", "created_at", "updated_at",
  "contacted_at", "closed_at", "archived_at",
  "assigned_user_id", "first_contacted_at", "last_contacted_at",
  "next_action_at", "loss_reason", "loss_note",
].join(",")

export async function getGarageLeads(
  session: ActiveGarageSession,
  query: GarageLeadQuery
): Promise<GarageLeadPage> {
  if (!session.garageId) return { leads: [], total: 0, page: 1, pageSize: 20 }
  const pageSize = 20
  const page = Math.max(1, query.page)
  let request = (await createClient())
    .from("leads")
    .select(LEAD_COLUMNS, { count: "exact" })
    .eq("garage_id", session.garageId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
  if (query.status) request = request.eq("status", query.status)
  if (query.type) request = request.eq("type", query.type)
  if (query.q) {
    const search = query.q.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)
    if (search) {
      request = request.or([
        `customer_name.ilike.%${search}%`,
        `customer_phone.ilike.%${search}%`,
        `customer_email.ilike.%${search}%`,
        `vehicle_title_snapshot.ilike.%${search}%`,
      ].join(","))
    }
  }
  const { data, error, count } = await request.range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw new Error(`Lecture des leads impossible (${error.code}).`)
  return {
    leads: (data ?? []) as unknown as LeadRecord[],
    total: count ?? 0,
    page,
    pageSize,
  }
}

export async function getGarageLeadDetail(
  session: ActiveGarageSession,
  leadId: string
) {
  if (!session.garageId) return null
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_COLUMNS)
    .eq("garage_id", session.garageId)
    .eq("id", leadId)
    .maybeSingle()
  if (error) throw new Error(`Lecture du lead impossible (${error.code}).`)
  if (!data) return null
  const { data: events, error: eventError } = await supabase
    .from("lead_events")
    .select("id,event_type,from_status,to_status,actor_user_id,metadata,created_at")
    .eq("garage_id", session.garageId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })
  if (eventError) throw new Error(`Lecture de l’historique impossible (${eventError.code}).`)
  return {
    lead: data as unknown as LeadRecord,
    events: (events ?? []) as unknown as LeadEventRecord[],
  }
}

export async function getLeadDashboardCounts(session: ActiveGarageSession) {
  if (!session.garageId) return []
  const { data, error } = await (await createClient())
    .from("leads")
    .select("status,type,created_at")
    .eq("garage_id", session.garageId)
    .in("status", ["NEW", "TO_CONTACT"])
  if (error) throw new Error(`Lecture des compteurs leads impossible (${error.code}).`)
  return (data ?? []) as unknown as Array<{
    status: LeadStatus
    type: LeadType
    created_at: string
  }>
}

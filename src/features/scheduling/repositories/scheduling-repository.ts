import { createPublicSupabaseClient } from "@/features/live-stock/data/public-supabase-client"
import { createClient } from "@/lib/supabase/server"
import type { AppointmentRecord, AppointmentTypeSetting } from "../types/scheduling"

const columns = "id,offer_id,commercial_snapshot,garage_id,lead_id,vehicle_id,customer_id,type,status,starts_at,ends_at,timezone,customer_name,customer_phone,customer_email,is_historical,payment_required,details,created_at"

export async function getAppointments(garageId: string) {
  const { data, error } = await (await createClient()).from("appointments").select(columns).eq("garage_id", garageId).order("starts_at")
  if (error) throw new Error(`Lecture des rendez-vous impossible (${error.code}).`)
  return (data ?? []) as unknown as AppointmentRecord[]
}

export async function getAppointment(garageId: string, id: string) {
  const { data, error } = await (await createClient()).from("appointments").select(columns).eq("garage_id", garageId).eq("id", id).maybeSingle()
  if (error) throw new Error(`Lecture du rendez-vous impossible (${error.code}).`)
  return data as unknown as AppointmentRecord | null
}

export async function getAppointmentEvents(garageId: string, id: string) {
  const { data, error } = await (await createClient()).from("appointment_events").select("id,event_type,old_status,new_status,created_at").eq("garage_id", garageId).eq("appointment_id", id).order("created_at", { ascending: false })
  if (error) throw new Error(`Lecture de l’historique impossible (${error.code}).`)
  return data ?? []
}

export async function getSchedulingConfiguration(garageId: string) {
  const db = await createClient()
  const [schedule, settings, hours, exceptions, services] = await Promise.all([
    db.from("garage_scheduling_settings").select("timezone").eq("garage_id", garageId).maybeSingle(),
    db.from("appointment_type_settings").select("*").eq("garage_id", garageId),
    db.from("garage_business_hours").select("*").eq("garage_id", garageId).order("day_of_week").order("opens_at"),
    db.from("garage_calendar_exceptions").select("*").eq("garage_id", garageId).gte("ends_at", new Date().toISOString()).order("starts_at"),
    db.from("garage_services").select("service_key").eq("garage_id", garageId).eq("is_enabled", true),
  ])
  for (const result of [schedule, settings, hours, exceptions, services]) if (result.error) throw new Error(`Lecture de l’agenda impossible (${result.error.code}).`)
  return { timezone: schedule.data?.timezone ?? null, settings: settings.data ?? [], hours: hours.data ?? [], exceptions: exceptions.data ?? [], services: (services.data ?? []).map(item => item.service_key) }
}

export async function saveSchedulingSettings(garageId: string, input: { readonly timezone: string; readonly hours: readonly { readonly dayOfWeek: number; readonly opensAt: string; readonly closesAt: string }[]; readonly exceptions?: readonly { readonly kind: string; readonly startsAt: string; readonly endsAt: string }[]; readonly settings: readonly AppointmentTypeSetting[] }) {
  const db = await createClient()
  const timezone = await db.from("garage_scheduling_settings").upsert({ garage_id: garageId, timezone: input.timezone, updated_at: new Date().toISOString() })
  if (timezone.error) return false
  const deleted = await db.from("garage_business_hours").delete().eq("garage_id", garageId)
  if (deleted.error) return false
  if (input.hours.length) {
    const inserted = await db.from("garage_business_hours").insert(input.hours.map(item => ({ garage_id: garageId, day_of_week: item.dayOfWeek, opens_at: item.opensAt, closes_at: item.closesAt })))
    if (inserted.error) return false
  }
  if (input.exceptions) {
    const removed = await db.from("garage_calendar_exceptions").delete().eq("garage_id", garageId).gte("ends_at", new Date().toISOString())
    if (removed.error) return false
    if (input.exceptions.length) {
      const inserted = await db.from("garage_calendar_exceptions").insert(input.exceptions.map(item => ({ garage_id: garageId, kind: item.kind, starts_at: item.startsAt, ends_at: item.endsAt })))
      if (inserted.error) return false
    }
  }
  const saved = await db.from("appointment_type_settings").upsert(input.settings.map(item => ({ garage_id: garageId, appointment_type: item.type, online_booking_enabled: item.onlineBookingEnabled, duration_minutes: item.durationMinutes, minimum_notice_minutes: item.minimumNoticeMinutes, booking_horizon_days: item.bookingHorizonDays, buffer_before_minutes: item.bufferBeforeMinutes, buffer_after_minutes: item.bufferAfterMinutes, auto_confirm: item.autoConfirm, payment_required: item.paymentRequired, simultaneous_capacity: item.simultaneousCapacity })), { onConflict: "garage_id,appointment_type" })
  return !saved.error
}

export async function getPublicAvailability(
  garageSlug: string,
  type: string,
  offerSlug?: string | null,
) {
  const from = new Date()
  const to = new Date(from.getTime() + 14 * 86400000)
  const iso = (value: Date) => value.toISOString().slice(0, 10)
  const { data, error } = await createPublicSupabaseClient().rpc("get_public_appointment_availability", {
    p_garage_slug: garageSlug,
    p_type: type,
    p_from: iso(from),
    p_to: iso(to),
    p_offer_slug: offerSlug ?? null,
  })
  if (error) { console.error("Public availability failed", { operation: "get_public_appointment_availability", code: error.code }); return [] }
  return (data ?? []) as { starts_at: string; ends_at: string; local_date: string; local_time: string }[]
}

export async function bookPublicAppointment(input: { readonly garageSlug: string; readonly vehicleSlug: string | null; readonly leadId: string; readonly type: string; readonly startsAt: string; readonly customerName: string; readonly phone: string | null; readonly email: string | null; readonly details: Readonly<Record<string, unknown>>; readonly fingerprint: string;readonly offerSlug?:string|null;readonly optionIds?:readonly string[] }) {
  const rpc=input.offerSlug?"book_public_catalog_appointment":"book_public_appointment"
  const catalog=input.offerSlug?{p_offer_slug:input.offerSlug,p_option_ids:input.optionIds??[]}:{}
  const { data, error } = await createPublicSupabaseClient().rpc(rpc, { p_garage_slug: input.garageSlug, p_vehicle_slug: input.vehicleSlug, p_lead_id: input.leadId, p_type: input.type, p_starts_at: input.startsAt, p_customer_name: input.customerName, p_phone: input.phone, p_email: input.email, p_details: input.details, p_fingerprint: input.fingerprint,...catalog })
  if (error) return { outcome: "persistence_error" }
  const row = Array.isArray(data) ? data[0] as { appointment_id?: unknown; outcome?: unknown; status?: unknown } : null
  return { outcome: typeof row?.outcome === "string" ? row.outcome : "persistence_error", appointmentId: typeof row?.appointment_id === "string" ? row.appointment_id : null, status: typeof row?.status === "string" ? row.status : null }
}

export async function createPublicRegistrationCase(input:{readonly garageSlug:string;readonly appointmentId:string;readonly leadId:string;readonly fingerprint:string;readonly procedure:string;readonly registration:string|null;readonly brand:string|null;readonly model:string|null}){
  const{data,error}=await createPublicSupabaseClient().rpc("create_public_registration_case",{p_garage_slug:input.garageSlug,p_appointment_id:input.appointmentId,p_lead_id:input.leadId,p_fingerprint:input.fingerprint,p_procedure:input.procedure,p_registration:input.registration,p_brand:input.brand,p_model:input.model});if(error)return null;const row=Array.isArray(data)?data[0] as{public_token?:unknown}:null;return typeof row?.public_token==="string"?row.public_token:null
}

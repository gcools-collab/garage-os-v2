import { createClient } from "@/lib/supabase/server"
import type { ActiveGarageSession } from "@/features/tenant"
import type { AppointmentRecord } from "@/features/scheduling/types/scheduling"
import type { LeadEventRecord, LeadRecord } from "@/features/leads/types"
import type { CommercialTaskRecord, LeadNoteRecord } from "@/features/commercial/types"
import type { PaymentRecord } from "@/features/payments/types/payment"
import { normalizeSearchQuery } from "../normalization"
import type {
  CustomerDirectoryPage,
  CustomerDirectoryQuery,
  CustomerDirectorySummary,
  CustomerRecord,
  CustomerVehicleRecord,
  HistoricalPaymentRecord,
} from "../types/customer"

const CUSTOMER_COLUMNS = [
  "id", "garage_id", "first_name", "last_name", "email", "normalized_email",
  "phone", "normalized_phone", "address_line", "postal_code", "city",
  "source", "external_id", "notes", "created_at", "updated_at",
].join(",")

const VEHICLE_COLUMNS = [
  "id", "garage_id", "customer_id", "stock_vehicle_id", "registration_number",
  "vin", "brand", "model", "version", "first_registration_date", "source",
  "created_at", "updated_at",
].join(",")

const LEAD_COLUMNS = [
  "id", "garage_id", "vehicle_id", "customer_id", "source", "type", "status",
  "customer_name", "customer_phone", "customer_email", "message",
  "vehicle_title_snapshot", "legacy_source", "created_at", "updated_at",
  "first_contacted_at", "last_contacted_at", "next_action_at",
].join(",")

const APPOINTMENT_COLUMNS = [
  "id", "garage_id", "lead_id", "vehicle_id", "customer_id", "type", "status",
  "starts_at", "ends_at", "timezone", "customer_name", "customer_phone",
  "customer_email", "is_historical", "legacy_source", "payment_required",
  "details", "created_at",
].join(",")

export type Customer360Bundle = {
  readonly customer: CustomerRecord
  readonly vehicles: readonly CustomerVehicleRecord[]
  readonly leads: readonly LeadRecord[]
  readonly leadEvents: readonly (LeadEventRecord & { readonly lead_id: string })[]
  readonly leadNotes: readonly LeadNoteRecord[]
  readonly commercialTasks: readonly CommercialTaskRecord[]
  readonly appointments: readonly AppointmentRecord[]
  readonly appointmentEvents: readonly {
    readonly id: string
    readonly appointment_id: string
    readonly event_type: string
    readonly old_status: string | null
    readonly new_status: string | null
    readonly created_at: string
  }[]
  readonly registrationCases: readonly {
    readonly id: string
    readonly lead_id: string | null
    readonly appointment_id: string | null
    readonly procedure_type: string
    readonly procedure_title: string
    readonly public_reference: string
    readonly status: string
    readonly registration_number: string | null
    readonly brand: string | null
    readonly model: string | null
    readonly created_at: string
  }[]
  readonly registrationEvents: readonly {
    readonly id: string
    readonly case_id: string
    readonly event_type: string
    readonly old_status: string | null
    readonly new_status: string | null
    readonly created_at: string
  }[]
  readonly historicalPayments: readonly HistoricalPaymentRecord[]
  readonly livePayments: readonly PaymentRecord[]
  readonly billingDocuments: readonly {
    readonly id: string
    readonly document_type: string
    readonly status: string
    readonly document_number: string | null
    readonly total_incl_vat_cents: number
    readonly amount_paid_cents: number
    readonly amount_credited_cents: number
    readonly currency: string
    readonly created_at: string
    readonly issued_at: string | null
  }[]
}

function assertGarage(session: ActiveGarageSession): string {
  if (!session.garageId) throw new Error("GARAGE_SESSION_REQUIRED")
  return session.garageId
}

export async function getCustomerDirectory(
  session: ActiveGarageSession,
  query: CustomerDirectoryQuery,
): Promise<CustomerDirectoryPage> {
  const garageId = assertGarage(session)
  const pageSize = 20
  const page = Math.max(1, query.page)

  let request = (await createClient())
    .from("customers")
    .select(CUSTOMER_COLUMNS, { count: "exact" })
    .eq("garage_id", garageId)

  const search = normalizeSearchQuery(query.q)
  if (search) {
    request = request.or([
      `first_name.ilike.%${search}%`,
      `last_name.ilike.%${search}%`,
      `email.ilike.%${search}%`,
      `phone.ilike.%${search}%`,
      `normalized_email.ilike.%${search}%`,
      `normalized_phone.ilike.%${search}%`,
    ].join(","))
  }

  if (query.sort === "name") {
    request = request.order("last_name", { ascending: true }).order("first_name", { ascending: true })
  } else if (query.sort === "activity") {
    request = request.order("updated_at", { ascending: false })
  } else {
    request = request.order("created_at", { ascending: false })
  }
  request = request.order("id", { ascending: true })

  const { data, error, count } = await request.range((page - 1) * pageSize, page * pageSize - 1)
  if (error) throw new Error(`Lecture des clients impossible (${error.code}).`)

  const customers = (data ?? []) as unknown as CustomerRecord[]
  const summaries = await getCustomerDirectorySummaries(garageId, customers.map((item) => item.id))

  return { customers, summaries, total: count ?? 0, page, pageSize }
}

export async function getCustomerDirectorySummaries(
  garageId: string,
  customerIds: readonly string[],
): Promise<Readonly<Record<string, CustomerDirectorySummary>>> {
  if (customerIds.length === 0) return {}

  const db = await createClient()
  const [vehicles, appointments, leads] = await Promise.all([
    db.from("customer_vehicles").select("customer_id").eq("garage_id", garageId).in("customer_id", [...customerIds]),
    db.from("appointments").select("customer_id,starts_at,status,type").eq("garage_id", garageId).in("customer_id", [...customerIds]),
    db.from("leads").select("customer_id,updated_at,created_at").eq("garage_id", garageId).in("customer_id", [...customerIds]),
  ])

  const vehicleCounts = new Map<string, number>()
  for (const row of vehicles.data ?? []) {
    const id = String(row.customer_id)
    vehicleCounts.set(id, (vehicleCounts.get(id) ?? 0) + 1)
  }

  const now = Date.now()
  const nextByCustomer = new Map<string, { at: string; label: string }>()
  const lastByCustomer = new Map<string, string>()

  for (const row of appointments.data ?? []) {
    const id = String(row.customer_id)
    const startsAt = String(row.starts_at)
    if (["CONFIRMED", "PENDING", "AWAITING_PAYMENT"].includes(String(row.status)) && Date.parse(startsAt) >= now) {
      const current = nextByCustomer.get(id)
      if (!current || Date.parse(startsAt) < Date.parse(current.at)) {
        nextByCustomer.set(id, { at: startsAt, label: String(row.type) })
      }
    }
    const candidate = startsAt
    const existing = lastByCustomer.get(id)
    if (!existing || Date.parse(candidate) > Date.parse(existing)) lastByCustomer.set(id, candidate)
  }

  for (const row of leads.data ?? []) {
    const id = String(row.customer_id)
    const candidate = String(row.updated_at ?? row.created_at)
    const existing = lastByCustomer.get(id)
    if (!existing || Date.parse(candidate) > Date.parse(existing)) lastByCustomer.set(id, candidate)
  }

  const summaries: Record<string, CustomerDirectorySummary> = {}
  for (const id of customerIds) {
    const next = nextByCustomer.get(id)
    summaries[id] = {
      vehicleCount: vehicleCounts.get(id) ?? 0,
      lastInteractionAt: lastByCustomer.get(id) ?? null,
      nextAppointmentAt: next?.at ?? null,
      nextAppointmentLabel: next?.label ?? null,
    }
  }
  return summaries
}

export async function getCustomerById(session: ActiveGarageSession, customerId: string): Promise<CustomerRecord | null> {
  const garageId = assertGarage(session)
  const { data, error } = await (await createClient())
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("garage_id", garageId)
    .eq("id", customerId)
    .maybeSingle()
  if (error) throw new Error(`Lecture du client impossible (${error.code}).`)
  return data as unknown as CustomerRecord | null
}

export async function findDuplicateCustomers(
  garageId: string,
  input: { readonly normalizedEmail: string | null; readonly normalizedPhone: string | null; readonly excludeId?: string },
): Promise<readonly CustomerRecord[]> {
  const db = await createClient()
  const filters: string[] = []
  if (input.normalizedEmail) filters.push(`normalized_email.eq.${input.normalizedEmail}`)
  if (input.normalizedPhone) filters.push(`normalized_phone.eq.${input.normalizedPhone}`)
  if (filters.length === 0) return []

  let query = db.from("customers").select(CUSTOMER_COLUMNS).eq("garage_id", garageId).or(filters.join(","))
  if (input.excludeId) query = query.neq("id", input.excludeId)
  const { data, error } = await query.limit(5)
  if (error) throw new Error(`Recherche de doublons impossible (${error.code}).`)
  return (data ?? []) as unknown as CustomerRecord[]
}

export async function getCustomer360Bundle(
  session: ActiveGarageSession,
  customerId: string,
): Promise<Customer360Bundle | null> {
  const garageId = assertGarage(session)
  const customer = await getCustomerById(session, customerId)
  if (!customer) return null

  const db = await createClient()
  const [
    vehicles,
    leads,
    appointments,
    registrationCases,
    historicalPayments,
  ] = await Promise.all([
    db.from("customer_vehicles").select(VEHICLE_COLUMNS).eq("garage_id", garageId).eq("customer_id", customerId).order("created_at"),
    db.from("leads").select(LEAD_COLUMNS).eq("garage_id", garageId).eq("customer_id", customerId).order("created_at", { ascending: false }),
    db.from("appointments").select(APPOINTMENT_COLUMNS).eq("garage_id", garageId).eq("customer_id", customerId).order("starts_at", { ascending: false }),
    db.from("registration_cases").select("id,lead_id,appointment_id,procedure_type,procedure_title,public_reference,status,registration_number,brand,model,created_at").eq("garage_id", garageId).eq("customer_id", customerId).order("created_at", { ascending: false }),
    db.from("historical_payments").select("id,garage_id,customer_id,source,external_order_id,amount_cents,currency,source_status,occurred_at,created_at").eq("garage_id", garageId).eq("customer_id", customerId).order("occurred_at", { ascending: false, nullsFirst: false }),
  ])

  for (const result of [vehicles, leads, appointments, registrationCases, historicalPayments]) {
    if (result.error) throw new Error(`Lecture Customer 360 impossible (${result.error.code}).`)
  }

  const leadRows = (leads.data ?? []) as unknown as LeadRecord[]
  const leadIds = leadRows.map((item) => item.id)
  const appointmentRows = (appointments.data ?? []) as unknown as AppointmentRecord[]
  const appointmentIds = appointmentRows.map((item) => item.id)
  const caseRows = registrationCases.data ?? []
  const caseIds = caseRows.map((item) => String(item.id))

  const [
    leadEvents,
    leadNotes,
    commercialTasks,
    appointmentEvents,
    registrationEvents,
    livePaymentsRaw,
    billingDocumentsRaw,
  ] = await Promise.all([
    leadIds.length
      ? db.from("lead_events").select("id,lead_id,event_type,from_status,to_status,actor_user_id,metadata,created_at").eq("garage_id", garageId).in("lead_id", leadIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? db.from("lead_notes").select("id,garage_id,lead_id,author_user_id,content,created_at,updated_at,deleted_at").eq("garage_id", garageId).in("lead_id", leadIds).is("deleted_at", null).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    leadIds.length
      ? db.from("commercial_tasks").select("id,garage_id,lead_id,vehicle_id,assigned_user_id,created_by_user_id,type,status,priority,title,description,due_at,completed_at,cancelled_at,snoozed_until,created_at,updated_at").eq("garage_id", garageId).in("lead_id", leadIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    appointmentIds.length
      ? db.from("appointment_events").select("id,appointment_id,event_type,old_status,new_status,created_at").eq("garage_id", garageId).in("appointment_id", appointmentIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    caseIds.length
      ? db.from("registration_case_events").select("id,case_id,event_type,old_status,new_status,created_at").eq("garage_id", garageId).in("case_id", caseIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
    appointmentIds.length
      ? db.from("payments").select("id,garage_id,appointment_id,provider,provider_payment_id,status,amount_cents,currency,payment_strategy,is_live,hosted_payment_url,created_at,paid_at,expires_at,metadata").eq("garage_id", garageId).in("appointment_id", appointmentIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    db.from("billing_documents").select("id,document_type,status,document_number,total_incl_vat_cents,amount_paid_cents,amount_credited_cents,currency,created_at,issued_at").eq("garage_id", garageId).eq("customer_id", customerId).order("created_at", { ascending: false }),
  ])

  for (const result of [leadEvents, leadNotes, commercialTasks, appointmentEvents, registrationEvents, livePaymentsRaw, billingDocumentsRaw]) {
    if (result.error) throw new Error(`Lecture Customer 360 impossible (${result.error.code}).`)
  }

  const livePayments = (livePaymentsRaw.data ?? []).map((row) => ({
    id: String(row.id),
    garageId: String(row.garage_id),
    appointmentId: String(row.appointment_id),
    provider: String(row.provider),
    providerPaymentId: typeof row.provider_payment_id === "string" ? row.provider_payment_id : null,
    status: row.status as PaymentRecord["status"],
    amountCents: Number(row.amount_cents),
    currency: String(row.currency),
    paymentStrategy: String(row.payment_strategy),
    isLive: Boolean(row.is_live),
    hostedPaymentUrl: typeof row.hosted_payment_url === "string" ? row.hosted_payment_url : null,
    createdAt: String(row.created_at),
    paidAt: typeof row.paid_at === "string" ? row.paid_at : null,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : null,
    metadata: typeof row.metadata === "object" && row.metadata !== null ? row.metadata as Readonly<Record<string, unknown>> : {},
  }))

  return {
    customer,
    vehicles: (vehicles.data ?? []) as unknown as CustomerVehicleRecord[],
    leads: leadRows,
    leadEvents: (leadEvents.data ?? []) as Customer360Bundle["leadEvents"],
    leadNotes: (leadNotes.data ?? []) as unknown as LeadNoteRecord[],
    commercialTasks: (commercialTasks.data ?? []) as unknown as CommercialTaskRecord[],
    appointments: appointmentRows,
    appointmentEvents: appointmentEvents.data ?? [],
    registrationCases: caseRows as Customer360Bundle["registrationCases"],
    registrationEvents: registrationEvents.data ?? [],
    historicalPayments: (historicalPayments.data ?? []) as unknown as HistoricalPaymentRecord[],
    livePayments,
    billingDocuments: (billingDocumentsRaw.data ?? []) as Customer360Bundle["billingDocuments"],
  }
}

export async function getCustomersByIds(
  session: ActiveGarageSession,
  customerIds: readonly string[],
): Promise<readonly CustomerRecord[]> {
  if (!session.garageId || customerIds.length === 0) return []
  const { data, error } = await (await createClient())
    .from("customers")
    .select(CUSTOMER_COLUMNS)
    .eq("garage_id", session.garageId)
    .in("id", [...customerIds])
    .order("last_name")
  if (error) throw new Error(`Lecture des clients impossible (${error.code}).`)
  return (data ?? []) as unknown as CustomerRecord[]
}

export async function searchCustomersByRegistration(
  garageId: string,
  registration: string,
): Promise<readonly string[]> {
  const normalized = registration.replace(/[\s-]/g, "").toUpperCase().slice(0, 20)
  if (!normalized) return []
  const { data, error } = await (await createClient())
    .from("customer_vehicles")
    .select("customer_id")
    .eq("garage_id", garageId)
    .ilike("registration_number", `%${normalized}%`)
    .limit(20)
  if (error) return []
  return [...new Set((data ?? []).map((row) => String(row.customer_id)))]
}

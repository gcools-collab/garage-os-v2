"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { formatCustomerName, normalizeEmail, normalizeFrenchPhone } from "../normalization"
import {
  findDuplicateCustomers,
  getCustomerById,
} from "../repositories/customer-repository"
import type { CustomerUpsertInput, CustomerVehicleInput } from "../types/customer"

async function assertSession() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) throw new Error("SESSION_REQUIRED")
  return session
}

function mapUpsert(input: CustomerUpsertInput) {
  return {
    first_name: input.firstName?.trim() || null,
    last_name: input.lastName?.trim() || null,
    email: input.email?.trim() || null,
    normalized_email: normalizeEmail(input.email),
    phone: input.phone?.trim() || null,
    normalized_phone: normalizeFrenchPhone(input.phone),
    address_line: input.addressLine?.trim() || null,
    postal_code: input.postalCode?.trim() || null,
    city: input.city?.trim() || null,
    notes: input.notes?.trim() || null,
    updated_at: new Date().toISOString(),
  }
}

export async function createCustomerAction(formData: FormData) {
  const session = await assertSession()
  const input: CustomerUpsertInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    city: String(formData.get("city") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  }

  const mapped = mapUpsert(input)
  if (!mapped.normalized_email && !mapped.normalized_phone && !mapped.first_name && !mapped.last_name) {
    redirect("/customers/new?error=identity")
  }

  const duplicates = await findDuplicateCustomers(session.garageId!, {
    normalizedEmail: mapped.normalized_email,
    normalizedPhone: mapped.normalized_phone,
  })

  const db = await createClient()
  const { data, error } = await db
    .from("customers")
    .insert({
      garage_id: session.garageId,
      ...mapped,
      source: "MANUAL",
      external_id: null,
    })
    .select("id")
    .single()

  if (error || !data) redirect("/customers/new?error=save")

  revalidatePath("/customers")
  if (duplicates.length > 0) {
    redirect(`/customers/${data.id}?warning=duplicate`)
  }
  redirect(`/customers/${data.id}`)
}

export async function updateCustomerAction(formData: FormData) {
  const session = await assertSession()
  const customerId = String(formData.get("customerId") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return

  const existing = await getCustomerById(session, customerId)
  if (!existing) return

  const input: CustomerUpsertInput = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    city: String(formData.get("city") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  }

  const mapped = mapUpsert(input)
  const duplicates = await findDuplicateCustomers(session.garageId!, {
    normalizedEmail: mapped.normalized_email,
    normalizedPhone: mapped.normalized_phone,
    excludeId: customerId,
  })

  const db = await createClient()
  const { error } = await db
    .from("customers")
    .update(mapped)
    .eq("garage_id", session.garageId)
    .eq("id", customerId)

  if (error) return

  revalidatePath("/customers")
  revalidatePath(`/customers/${customerId}`)
  if (duplicates.length > 0) {
    redirect(`/customers/${customerId}?warning=duplicate`)
  }
  redirect(`/customers/${customerId}`)
}

export async function createCustomerLeadAction(formData: FormData) {
  const session = await assertSession()
  const customerId = String(formData.get("customerId") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return

  const customer = await getCustomerById(session, customerId)
  if (!customer) return

  const message = String(formData.get("message") ?? "").trim().slice(0, 4000)
  const db = await createClient()
  const { data, error } = await db
    .from("leads")
    .insert({
      garage_id: session.garageId,
      customer_id: customerId,
      source: "MANUAL",
      type: "GENERAL_CONTACT",
      status: "NEW",
      customer_name: formatCustomerName(customer.first_name, customer.last_name),
      customer_phone: customer.phone,
      customer_email: customer.email,
      message: message || null,
      public_garage_slug: session.garageSlug ?? "garage",
      consent_contact: true,
      consent_marketing: false,
    })
    .select("id")
    .single()

  if (error || !data) return

  await db.from("lead_events").insert({
    garage_id: session.garageId,
    lead_id: data.id,
    event_type: "CREATED",
    to_status: "NEW",
    actor_user_id: session.userId,
    metadata: { origin: "customer_360" },
  })

  revalidatePath(`/customers/${customerId}`)
  redirect(`/leads/${data.id}`)
}

export async function upsertCustomerVehicleAction(formData: FormData) {
  const session = await assertSession()
  const customerId = String(formData.get("customerId") ?? "")
  const vehicleId = String(formData.get("vehicleId") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return

  const customer = await getCustomerById(session, customerId)
  if (!customer) return

  const input: CustomerVehicleInput = {
    registrationNumber: String(formData.get("registrationNumber") ?? "") || null,
    vin: String(formData.get("vin") ?? "") || null,
    brand: String(formData.get("brand") ?? "") || null,
    model: String(formData.get("model") ?? "") || null,
    version: String(formData.get("version") ?? "") || null,
    firstRegistrationDate: String(formData.get("firstRegistrationDate") ?? "") || null,
    stockVehicleId: String(formData.get("stockVehicleId") ?? "") || null,
  }

  const stockVehicleId = input.stockVehicleId && /^[0-9a-f-]{36}$/i.test(input.stockVehicleId) ? input.stockVehicleId : null
  if (stockVehicleId) {
    const { data: stock } = await (await createClient())
      .from("vehicles")
      .select("id")
      .eq("garage_id", session.garageId)
      .eq("id", stockVehicleId)
      .maybeSingle()
    if (!stock) return
  }

  const payload = {
    garage_id: session.garageId,
    customer_id: customerId,
    registration_number: input.registrationNumber?.trim().toUpperCase() || null,
    vin: input.vin?.trim().toUpperCase() || null,
    brand: input.brand?.trim() || null,
    model: input.model?.trim() || null,
    version: input.version?.trim() || null,
    first_registration_date: input.firstRegistrationDate || null,
    stock_vehicle_id: stockVehicleId,
    source: "MANUAL" as const,
    external_id: null,
    updated_at: new Date().toISOString(),
  }

  const db = await createClient()
  if (vehicleId && /^[0-9a-f-]{36}$/i.test(vehicleId)) {
    const { error } = await db
      .from("customer_vehicles")
      .update(payload)
      .eq("garage_id", session.garageId)
      .eq("customer_id", customerId)
      .eq("id", vehicleId)
    if (error) return
  } else {
    const { error } = await db.from("customer_vehicles").insert(payload)
    if (error) return
  }

  revalidatePath(`/customers/${customerId}`)
  redirect(`/customers/${customerId}`)
}

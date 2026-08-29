import { PayPlugProvider } from "../providers/payplug/payplug-provider"
import { createPaymentAdminClient } from "../repositories/payment-repository"
import { getPayPlugConfig, validatePayPlugConfig } from "../providers/payplug/payplug-client"

type PaymentFailureReason = "already_paid" | "configuration" | "disabled" | "invalid_snapshot" | "missing_hosted_url" | "persistence" | "provider" | "public_https_required" | "unavailable"
export type PaymentCreationResult = Readonly<{ ok: true; url: string }> | Readonly<{ ok: false; reason: PaymentFailureReason }>

export async function startAppointmentPayment(appointmentId: string, garageSlug: string): Promise<PaymentCreationResult> {
  let config
  try {
    config = getPayPlugConfig()
    if (!config.enabled) return { ok: false, reason: "disabled" }
    validatePayPlugConfig(config)
  } catch {
    return { ok: false, reason: "configuration" }
  }

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
  if (!base?.startsWith("https://")) return { ok: false, reason: "public_https_required" }

  const db = createPaymentAdminClient()
  const { data: garage } = await db.from("garages").select("id").eq("live_slug", garageSlug.trim().toLowerCase()).eq("live_enabled", true).maybeSingle()
  if (!garage) return { ok: false, reason: "unavailable" }

  const { data: appointment } = await db.from("appointments")
    .select("id,garage_id,status,customer_name,customer_phone,customer_email,commercial_snapshot,is_historical")
    .eq("id", appointmentId).eq("garage_id", garage.id).eq("is_historical", false).maybeSingle()
  if (!appointment || appointment.status !== "AWAITING_PAYMENT") return { ok: false, reason: "unavailable" }

  const snapshot = appointment.commercial_snapshot as Readonly<Record<string, unknown>> | null
  const amount = snapshot?.amount_due_now_cents
  const currency = snapshot?.currency
  const strategy = snapshot?.payment_strategy
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0 || currency !== "EUR" || (strategy !== "FULL_PAYMENT" && strategy !== "DEPOSIT")) return { ok: false, reason: "invalid_snapshot" }

  const existing = await db.from("payments").select("id,hosted_payment_url,status").eq("garage_id", garage.id).eq("appointment_id", appointmentId)
    .in("status", ["CREATED", "PENDING", "PAID"]).order("created_at", { ascending: false }).limit(1).maybeSingle()
  if (existing.data?.status === "PAID") return { ok: false, reason: "already_paid" }
  if (existing.data?.hosted_payment_url) return { ok: true, url: String(existing.data.hosted_payment_url) }

  const { data: payment, error } = await db.from("payments").insert({
    garage_id: garage.id, appointment_id: appointment.id, provider: "PAYPLUG", status: "CREATED", amount_cents: amount,
    currency, payment_strategy: strategy, is_live: false, metadata: {},
  }).select("id").single()
  if (error || !payment) return { ok: false, reason: "persistence" }

  try {
    const names = String(appointment.customer_name).trim().split(/\s+/)
    const offerName = typeof snapshot?.offer_name === "string" && snapshot.offer_name.trim() ? snapshot.offer_name.trim() : "Rendez-vous"
    const created = await new PayPlugProvider().createPayment({
      amountCents: amount, currency, description: strategy === "DEPOSIT" ? `Acompte ${offerName}` : offerName,
      customer: { firstName: names[0] ?? "Client", lastName: names.slice(1).join(" ") || "Garage OS", email: appointment.customer_email, phone: appointment.customer_phone },
      returnUrl: `${base}/g/${garageSlug}/payment/return?payment=${payment.id}`,
      cancelUrl: `${base}/g/${garageSlug}/payment/cancel?payment=${payment.id}`,
      notificationUrl: `${base}/api/payments/payplug/notification`,
      metadata: { garage_os_payment_id: payment.id, appointment_id: appointment.id, garage_id: garage.id },
    })
    if (created.isLive) throw new Error("PAYPLUG_LIVE_RESPONSE_REJECTED")

    const persisted = await db.from("payments").update({ provider_payment_id: created.id, status: "PENDING", hosted_payment_url: created.paymentUrl, expires_at: created.expiresAt, metadata: created.metadata, updated_at: new Date().toISOString() }).eq("id", payment.id).eq("garage_id", garage.id)
    if (persisted.error) throw new Error("PAYMENT_PROVIDER_ID_PERSISTENCE_FAILED")
    await db.from("payment_events").insert([
      { garage_id: garage.id, payment_id: payment.id, appointment_id: appointment.id, provider: "PAYPLUG", event_type: "CREATED" },
      { garage_id: garage.id, payment_id: payment.id, appointment_id: appointment.id, provider: "PAYPLUG", event_type: "PAYMENT_PAGE_CREATED" },
    ])
    return created.paymentUrl ? { ok: true, url: created.paymentUrl } : { ok: false, reason: "missing_hosted_url" }
  } catch (providerError) {
    await db.from("payments").update({ status: "FAILED", failed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", payment.id).eq("garage_id", garage.id)
    await db.from("payment_events").insert({ garage_id: garage.id, payment_id: payment.id, appointment_id: appointment.id, provider: "PAYPLUG", event_type: "FAILED", metadata: { stage: "creation" } })
    console.error("PayPlug payment creation failed", { provider: "PAYPLUG", operation: "create_test_payment", errorType: providerError instanceof Error ? providerError.name : "UnknownError" })
    return { ok: false, reason: "provider" }
  }
}

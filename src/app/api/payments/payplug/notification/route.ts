import { NextResponse } from "next/server"
import { PayPlugProvider, applyVerifiedProviderPayment, createPaymentAdminClient } from "@/features/payments"

export async function POST(request: Request) {
  try {
    const body = await request.json() as { readonly id?: unknown; readonly object?: unknown; readonly is_live?: unknown }
    if (typeof body.id !== "string" || !body.id.startsWith("pay_") || body.object !== "payment" || body.is_live !== false) return NextResponse.json({ ok: false }, { status: 400 })
    const db = createPaymentAdminClient()
    const { data, error } = await db.from("payments").select("id,provider_payment_id,is_live").eq("provider", "PAYPLUG").eq("provider_payment_id", body.id).eq("is_live", false).maybeSingle()
    if (error) throw new Error("PAYMENT_LOOKUP_FAILED")
    if (!data) return NextResponse.json({ ok: false }, { status: 404 })
    const trusted = await new PayPlugProvider().retrievePayment(body.id)
    if (trusted.isLive) return NextResponse.json({ ok: false }, { status: 400 })
    const outcome = await applyVerifiedProviderPayment(String(data.id), trusted)
    if (outcome === "mismatch" || outcome === "not_found") return NextResponse.json({ ok: false, outcome }, { status: 409 })
    return NextResponse.json({ ok: true, outcome })
  } catch (error) {
    console.error("PayPlug notification failed", { provider: "PAYPLUG", operation: "verify_test_notification", errorType: error instanceof Error ? error.name : "UnknownError" })
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}

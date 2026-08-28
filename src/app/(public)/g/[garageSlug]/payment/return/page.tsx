import Link from "next/link"
import { buildPaymentViewModel, createPaymentAdminClient } from "@/features/payments"
import type { PaymentRecord } from "@/features/payments"

export default async function PaymentReturn({ params, searchParams }: { readonly params: Promise<{ garageSlug: string }>; readonly searchParams: Promise<{ payment?: string }> }) {
  const { garageSlug } = await params
  const { payment } = await searchParams
  let view: ReturnType<typeof buildPaymentViewModel> | null = null

  if (payment) {
    const db = createPaymentAdminClient()
    const { data: garage } = await db.from("garages").select("id").eq("live_slug", garageSlug.trim().toLowerCase()).eq("live_enabled", true).maybeSingle()
    if (garage) {
      const { data } = await db.from("payments").select("*").eq("id", payment).eq("garage_id", garage.id).eq("provider", "PAYPLUG").eq("is_live", false).maybeSingle()
      if (data) view = buildPaymentViewModel({
        id: String(data.id), garageId: String(data.garage_id), appointmentId: String(data.appointment_id), provider: String(data.provider),
        providerPaymentId: typeof data.provider_payment_id === "string" ? data.provider_payment_id : null,
        status: data.status as PaymentRecord["status"], amountCents: Number(data.amount_cents), currency: String(data.currency), paymentStrategy: String(data.payment_strategy),
        isLive: false, hostedPaymentUrl: typeof data.hosted_payment_url === "string" ? data.hosted_payment_url : null, createdAt: String(data.created_at),
        paidAt: typeof data.paid_at === "string" ? data.paid_at : null, expiresAt: typeof data.expires_at === "string" ? data.expires_at : null, metadata: {},
      })
    }
  }

  return <main className="mx-auto max-w-xl px-5 py-20">
    <h1 className="text-3xl font-semibold">{view?.statusLabel === "Payé" ? "Paiement confirmé" : "Paiement en cours de vérification…"}</h1>
    <p className="mt-4">La confirmation dépend exclusivement de la vérification serveur PayPlug.</p>
    {view ? <p className="mt-3 font-medium">{view.amountLabel} · {view.statusLabel}</p> : <p className="mt-3 text-muted-foreground">La référence de paiement est inconnue ou n’appartient pas à ce garage.</p>}
    <Link href={`/g/${garageSlug}`} className="mt-6 inline-flex rounded-md border px-4 py-2">Retour au garage</Link>
  </main>
}

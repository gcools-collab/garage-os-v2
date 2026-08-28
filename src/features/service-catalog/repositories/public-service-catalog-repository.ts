import { createPublicSupabaseClient } from "@/features/live-stock/data/public-supabase-client"
export type PublicServiceOffer = Readonly<{id:string;serviceKey:string;name:string;slug:string;description:string|null;durationMinutes:number|null;pricingType:string;amountCents:number|null;currency:string;paymentStrategy:string;depositAmountCents:number|null}>
export type PublicServiceOfferOption = Readonly<{
  readonly id: string
  readonly offerId: string
  readonly name: string
  readonly amountCents: number | null
  readonly durationDeltaMinutes: number
}>

export async function getPublicServiceOfferOptions(garageSlug: string, serviceKey: string) {
  const offers = await getPublicServiceOffers(garageSlug, serviceKey)
  if (!offers.length) return []
  const offerIds = offers.map((offer) => offer.id)
  const { data, error } = await createPublicSupabaseClient()
    .from("public_live_service_offer_options")
    .select("id,offer_id,name,amount_cents,duration_delta_minutes")
    .in("offer_id", offerIds)
  if (error) return []
  return (data ?? []).map((row) => ({
    id: String(row.id),
    offerId: String(row.offer_id),
    name: String(row.name),
    amountCents: row.amount_cents === null ? null : Number(row.amount_cents),
    durationDeltaMinutes: Number(row.duration_delta_minutes ?? 0),
  })) satisfies PublicServiceOfferOption[]
}

export async function getPublicServiceOffers(garageSlug: string, serviceKey: string) {
  const { data, error } = await createPublicSupabaseClient()
    .from("public_live_service_offers")
    .select("id,service_key,name,slug,short_description,duration_minutes,pricing_type,amount_cents,currency,payment_strategy,deposit_amount_cents")
    .eq("garage_slug", garageSlug)
    .eq("service_key", serviceKey)
    .order("display_order")
  if (error) return []
  return (data ?? []).map((row) => ({
    id: String(row.id),
    serviceKey: String(row.service_key),
    name: String(row.name),
    slug: String(row.slug),
    description: typeof row.short_description === "string" ? row.short_description : null,
    durationMinutes: row.duration_minutes === null ? null : Number(row.duration_minutes),
    pricingType: String(row.pricing_type),
    amountCents: row.amount_cents === null ? null : Number(row.amount_cents),
    currency: String(row.currency),
    paymentStrategy: String(row.payment_strategy),
    depositAmountCents: row.deposit_amount_cents === null ? null : Number(row.deposit_amount_cents),
  })) satisfies PublicServiceOffer[]
}

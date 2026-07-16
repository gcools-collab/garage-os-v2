import { z } from "zod"

import type {
  AcquisitionListing,
  DraftVehicleCharacteristics,
  VehicleAcquisitionProvider,
} from "../types"

const attributeSchema = z.object({
  key: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  valueLabel: z.string().nullable(),
  values: z.array(z.string()),
  valuesLabel: z.array(z.string()),
})

const listingSchema = z.object({
  id: z.string(),
  subject: z.string(),
  body: z.string().nullable(),
  brand: z.string().nullable(),
  url: z.url(),
  price: z.number().nonnegative().nullable(),
  images: z.array(z.url()),
  attributes: z.record(z.string(), attributeSchema),
  ownerType: z.enum(["professional", "private", "unknown"]),
  firstPublicationDate: z.string().nullable(),
})

type BridgeListing = z.infer<typeof listingSchema>

function attributeText(listing: BridgeListing, ...keys: string[]) {
  for (const key of keys) {
    const attribute = listing.attributes[key]
    const value = attribute?.valueLabel ?? attribute?.value
    if (value !== null && value !== undefined) return String(value)
  }
  return null
}

function attributeNumber(listing: BridgeListing, ...keys: string[]) {
  const value = attributeText(listing, ...keys)
  if (!value) return null
  const parsed = Number(value.replace(/[^0-9.,-]/g, "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

function characteristics(listing: BridgeListing): DraftVehicleCharacteristics {
  return {
    fuel: attributeText(listing, "fuel"),
    gearbox: attributeText(listing, "gearbox"),
    powerDin: attributeNumber(
      listing,
      "horse_power_din",
      "power_din",
      "horsepower"
    ),
    color: attributeText(listing, "vehicle_color", "color"),
    doors: attributeNumber(listing, "doors"),
    seats: attributeNumber(listing, "seats"),
  }
}

export class LeboncoinAcquisitionProvider implements VehicleAcquisitionProvider {
  readonly id = "leboncoin"

  constructor(
    private readonly bridgeUrl: string,
    private readonly apiKey: string
  ) {}

  supports(url: URL) {
    const hostname = url.hostname.toLowerCase()
    return hostname === "leboncoin.fr" || hostname.endsWith(".leboncoin.fr")
  }

  async getListing(url: string): Promise<AcquisitionListing> {
    const response = await fetch(new URL("/listing", this.bridgeUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Api-Key": this.apiKey,
      },
      body: JSON.stringify({ url }),
      cache: "no-store",
      signal: AbortSignal.timeout(21_000),
    })

    if (!response.ok) {
      throw new Error(`Le bridge Leboncoin a répondu avec le statut ${response.status}.`)
    }

    const parsed = listingSchema.safeParse(await response.json())
    if (!parsed.success) {
      throw new Error("La réponse du bridge Leboncoin est invalide.")
    }

    const listing = parsed.data
    return {
      externalId: listing.id,
      publishedAt: listing.firstPublicationDate,
      brand: listing.brand ?? attributeText(listing, "brand") ?? "",
      model: attributeText(listing, "model") ?? "",
      trim: attributeText(listing, "vehicle_version", "version", "trim"),
      year: attributeNumber(listing, "regdate", "registration_year", "year"),
      mileage: attributeNumber(listing, "mileage"),
      advertisedPrice: listing.price,
      description: listing.body,
      photos: listing.images,
      characteristics: characteristics(listing),
    }
  }
}

import { z } from "zod"

import type {
  AcquisitionListing,
  DraftVehicleCharacteristics,
  VehicleAcquisitionProvider,
} from "../types"

const attributeSchema = z.object({
  key: z.string(),
  keyLabel: z.string().nullable(),
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
  favoriteCount: z.number().int().nonnegative().nullable(),
  location: z
    .object({
      city: z.string().nullable(),
      cityLabel: z.string().nullable(),
      zipcode: z.string().nullable(),
      departmentName: z.string().nullable(),
      regionName: z.string().nullable(),
    })
    .nullable(),
})

export type BridgeListing = z.infer<typeof listingSchema>

function normalizeAttributeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .replace(/[^a-z0-9]+/g, "")
}

function attributeText(listing: BridgeListing, ...aliases: string[]) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeAttributeName(alias)
    for (const [recordKey, attribute] of Object.entries(listing.attributes)) {
      const names = [recordKey, attribute.key, attribute.keyLabel]
        .filter((name): name is string => Boolean(name))
        .map(normalizeAttributeName)
      if (!names.includes(normalizedAlias)) continue

      const value = attribute.valueLabel ?? attribute.value
      if (value !== null && value !== undefined) return String(value)
    }
  }
  return null
}

function attributeNumber(listing: BridgeListing, ...keys: string[]) {
  const value = attributeText(listing, ...keys)
  if (!value) return null
  const normalized = value.replace(/[^0-9.,-]/g, "").replace(",", ".")
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function attributeDate(listing: BridgeListing, ...keys: string[]) {
  const value = attributeText(listing, ...keys)
  if (!value) return null
  const frenchDate = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (frenchDate) return `${frenchDate[3]}-${frenchDate[2]}-${frenchDate[1]}`
  const frenchMonth = value.match(/^(\d{2})[/-](\d{4})$/)
  if (frenchMonth) return `${frenchMonth[2]}-${frenchMonth[1]}-01`
  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return isoDate ?? null
}

function characteristics(listing: BridgeListing): DraftVehicleCharacteristics {
  return {
    fuel: attributeText(listing, "fuel", "energy", "Énergie", "Carburant"),
    gearbox: attributeText(listing, "gearbox", "Boîte de vitesses"),
    powerDin: attributeNumber(
      listing,
      "horse_power_din",
      "power_din",
      "horsepower",
      "Puissance DIN"
    ),
    fiscalPower: attributeNumber(
      listing,
      "horse_power",
      "fiscal_power",
      "Puissance fiscale"
    ),
    color: attributeText(
      listing,
      "vehicule_color",
      "vehicle_color",
      "color",
      "Couleur"
    ),
    doors: attributeNumber(listing, "doors", "Nombre de portes"),
    seats: attributeNumber(listing, "seats", "Nombre de places"),
    firstRegistrationDate: attributeDate(
      listing,
      "first_registration_date",
      "issuance_date",
      "regdate",
      "Date de première mise en circulation",
      "Première mise en circulation"
    ),
    bodyType: attributeText(
      listing,
      "vehicle_type",
      "body_type",
      "Type de véhicule",
      "Carrosserie"
    ),
    upholstery: attributeText(
      listing,
      "vehicle_upholstery",
      "upholstery",
      "sellerie",
      "Sellerie"
    ),
    critAir: attributeNumber(listing, "critair", "air_crit", "Crit'Air"),
  }
}

function cleanTrim(trim: string | null, model: string) {
  if (!trim) return null
  const escapedModel = model.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const withoutRepeatedModel = escapedModel
    ? trim.replace(new RegExp(escapedModel, "gi"), " ")
    : trim
  const cleaned = withoutRepeatedModel.replace(/\s+/g, " ").trim()
  return cleaned && cleaned.toLocaleLowerCase("fr") !== "base" ? cleaned : null
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

    return mapLeboncoinAcquisitionListing(parsed.data)
  }
}

export function mapLeboncoinAcquisitionListing(
  listing: BridgeListing
): AcquisitionListing {
    const brand =
      attributeText(listing, "u_car_brand", "brand", "Marque") ??
      (listing.brand === "leboncoin" ? "" : listing.brand ?? "")
    const model =
      attributeText(listing, "u_car_model", "model", "Modèle") ?? ""
    const rawTrim = attributeText(
      listing,
      "u_car_version",
      "u_car_finition",
      "vehicle_version",
      "manufacturer_trim",
      "manufacturer_version",
      "Finition constructeur",
      "Version constructeur",
      "version",
      "trim"
    )
  return {
      externalId: listing.id,
      publishedAt: listing.firstPublicationDate,
      originalTitle: listing.subject,
      brand,
      model,
      trim: cleanTrim(rawTrim, model),
      year: attributeNumber(
        listing,
        "regdate",
        "registration_year",
        "model_year",
        "Année modèle",
        "year"
      ),
      mileage: attributeNumber(listing, "mileage", "Kilométrage"),
      advertisedPrice: listing.price,
      description: listing.body,
      photos: listing.images,
      location:
        listing.location?.cityLabel ??
        listing.location?.city ??
        listing.location?.departmentName ??
        null,
      favoriteCount: listing.favoriteCount,
      characteristics: characteristics(listing),
  }
}

import type { MarketListing, MarketSellerType } from "../../types"
import type { LeboncoinAttribute, LeboncoinListing } from "./types"

const PROVIDER_ID = "leboncoin"

function getAttribute(
  listing: LeboncoinListing,
  ...keys: string[]
): LeboncoinAttribute | undefined {
  const normalizedKeys = new Set(keys.map(normalizeKey))
  return Object.values(listing.attributes).find((attribute) =>
    [attribute.key, attribute.keyLabel].some((value) => value && normalizedKeys.has(normalizeKey(value)))
  )
}

function normalizeKey(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function getAttributeText(listing: LeboncoinListing, ...keys: string[]) {
  const attribute = getAttribute(listing, ...keys)
  return attribute?.valueLabel ?? attribute?.value ?? null
}

function getAttributeNumber(listing: LeboncoinListing, ...keys: string[]) {
  const rawValue = getAttributeText(listing, ...keys)
  if (!rawValue) return null

  const normalizedValue = rawValue.replace(/[^0-9.,-]/g, "").replace(",", ".")
  const value = Number(normalizedValue)
  return Number.isFinite(value) ? value : null
}

const INVALID_IDENTITIES = new Set(["", "leboncoin", "lbc", "unknown", "inconnu"])

function credibleIdentity(...values: Array<string | null | undefined>) {
  return values.find((value) => {
    if (!value) return false
    const normalized = value.trim().toLowerCase()
    return !INVALID_IDENTITIES.has(normalized) && /[a-zÀ-ÿ0-9]/i.test(normalized)
  })?.trim() ?? ""
}

function mapSellerType(ownerType: LeboncoinListing["ownerType"]): MarketSellerType {
  if (ownerType === "professional") return "PROFESSIONAL"
  if (ownerType === "private") return "PRIVATE"
  return "UNKNOWN"
}

export function mapLeboncoinListing(listing: LeboncoinListing): MarketListing {
  return {
    providerId: PROVIDER_ID,
    externalId: listing.id,
    url: listing.url,
    title: listing.subject,
    brand: credibleIdentity(
      getAttributeText(listing, "u_car_brand", "brand", "marque"),
      listing.brand
    ),
    model: credibleIdentity(
      getAttributeText(listing, "u_car_model", "model", "modele"),
      listing.model
    ),
    trim: getAttributeText(listing, "vehicle_version", "version", "trim", "finition constructeur", "version constructeur"),
    year:
      getAttributeNumber(listing, "regdate", "registration_year", "year", "annee modele") ??
      null,
    mileage: getAttributeNumber(listing, "mileage", "kilometrage"),
    fuel: getAttributeText(listing, "fuel", "energie", "carburant"),
    gearbox: getAttributeText(listing, "gearbox", "boite de vitesses"),
    powerDin: getAttributeNumber(
      listing,
      "horse_power_din",
      "power_din",
      "horsepower"
    ),
    price: listing.price ?? 0,
    currency: "EUR",
    location:
      listing.location?.cityLabel ??
      listing.location?.city ??
      listing.location?.departmentName ??
      null,
    sellerType: mapSellerType(listing.ownerType),
    publishedAt: listing.firstPublicationDate,
    imageUrls: [...listing.images],
    favoriteCount: listing.favoriteCount,
  }
}

import type { MarketListing, MarketSellerType } from "../../types"
import type { LeboncoinAttribute, LeboncoinListing } from "./types"

const PROVIDER_ID = "leboncoin"

function getAttribute(
  listing: LeboncoinListing,
  ...keys: string[]
): LeboncoinAttribute | undefined {
  return keys.map((key) => listing.attributes[key]).find(Boolean)
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
    brand: listing.brand ?? getAttributeText(listing, "brand") ?? "",
    model: getAttributeText(listing, "model") ?? "",
    trim: getAttributeText(listing, "vehicle_version", "version", "trim"),
    year:
      getAttributeNumber(listing, "regdate", "registration_year", "year") ??
      0,
    mileage: getAttributeNumber(listing, "mileage") ?? 0,
    fuel: getAttributeText(listing, "fuel"),
    gearbox: getAttributeText(listing, "gearbox"),
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

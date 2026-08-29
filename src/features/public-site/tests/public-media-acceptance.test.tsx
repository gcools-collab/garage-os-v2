import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import type { LiveStockVehicle, PublicVehicleImageRecord, PublicVehicleRecord } from "@/features/live-stock"
import { mapPublicVehicle, mapPublicVehicleImages } from "@/features/live-stock/mappers/public-vehicle-mapper"
import { PremiumHomepageBuilder } from "@/features/public-site-premium/builders"
import { PremiumCustomerActions, PremiumHomepage, PremiumVehicleCard } from "@/features/public-site-premium/components"
import { getLiveThemeDefinition } from "@/features/theme"
import { resolveVehicleImagePublicUrl } from "@/features/vehicles/vehicle-image-presentation"
import { formatPublicVehicleDisplayName, formatVehicleMileage } from "@/features/vehicles/vehicle-presentation"
import {
  buildPublicHomepage,
  buildVehiclePublicCard,
} from "../builders"
import type { PublicGarageContext } from "@/features/live-stock"

const GARAGE_ID = "363f2dc0-bfd3-48d6-a1cc-96e113e96094"
const VEHICLE_ID = "11111111-1111-4111-8111-111111111111"
const SUPABASE_URL = "https://example.supabase.co"

const garage: PublicGarageContext = {
  garageId: GARAGE_ID,
  garageSlug: "sap",
  displayName: "Service Auto aux Particuliers",
  status: "ACTIVE",
  basePath: "/g/sap",
  branding: {
    displayName: "Service Auto aux Particuliers",
    legalName: null,
    logoUrl: null,
    faviconUrl: null,
    phone: "03 27 00 00 00",
    formattedPhone: "03 27 00 00 00",
    email: "contact@sap.test",
    formattedAddress: "Raismes",
    shortDescription: "Sélection automobile.",
    socialLinks: { facebookUrl: null, instagramUrl: null },
    themeKey: "black-yellow",
    colors: { primary: null, secondary: null, accent: null },
  },
  liveTheme: getLiveThemeDefinition("black-yellow"),
}

function vehicleRecord(overrides: Partial<PublicVehicleRecord> = {}): PublicVehicleRecord {
  return {
    id: VEHICLE_ID,
    garage_id: GARAGE_ID,
    live_slug: "mg-mgb-1969-11111",
    brand: "Mg",
    model: "Mgb",
    version: null,
    year: 1969,
    mileage: null,
    fuel: "Essence",
    gearbox: "Manuelle",
    body_type: null,
    power_din: null,
    fiscal_power: null,
    doors: null,
    seats: null,
    color: "Rouge",
    first_registration_date: null,
    selling_price: 13_490,
    description: "MG MGB d'époque.",
    status: "PUBLISHED",
    publication_status: "PUBLISHED",
    published_at: "2026-07-20T10:00:00.000Z",
    created_at: "2026-07-10T10:00:00.000Z",
    updated_at: "2026-07-20T10:00:00.000Z",
    co2_emissions: null,
    crit_air: null,
    euro_standard: null,
    owners_count: null,
    ...overrides,
  }
}

function imageRecord(overrides: Partial<PublicVehicleImageRecord> = {}): PublicVehicleImageRecord {
  return {
    id: "image-1",
    vehicle_id: VEHICLE_ID,
    garage_id: GARAGE_ID,
    storage_path: `${GARAGE_ID}/${VEHICLE_ID}/Photo héritée.jpg`,
    is_primary: true,
    display_order: 0,
    created_at: "2026-07-20T10:00:00.000Z",
    ...overrides,
  }
}

function liveVehicle(): LiveStockVehicle {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
  try {
    return mapPublicVehicle(vehicleRecord(), [imageRecord()], {
      exterior360: false,
      interiorTour: false,
    })
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
  }
}

test("public mapper resolves real tenant storage paths with the shared resolver", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
  try {
    const record = vehicleRecord()
    const photos = mapPublicVehicleImages({
      vehicle: record,
      images: [imageRecord()],
    })
    assert.equal(photos.length, 1)
    assert.equal(
      photos[0].url,
      resolveVehicleImagePublicUrl({
        url: null,
        storagePath: photos[0].path,
        garageId: GARAGE_ID,
        vehicleId: VEHICLE_ID,
        supabaseUrl: SUPABASE_URL,
      }),
    )
    assert.match(photos[0].url, /Photo%20h%C3%A9rit%C3%A9e\.jpg/)
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
  }
})

test("public mapper drops unresolved media instead of fabricating placeholders", () => {
  const record = vehicleRecord()
  const photos = mapPublicVehicleImages({
    vehicle: record,
    images: [imageRecord({ storage_path: `foreign/${VEHICLE_ID}/photo.jpg` })],
  })
  assert.deepEqual(photos, [])
})

test("homepage hero stays media-free when no resolvable image exists", () => {
  const homepage = buildPublicHomepage(garage, [
    mapPublicVehicle(vehicleRecord(), [], { exterior360: false, interiorTour: false }),
  ])
  assert.equal(homepage.hero.image, null)
  const premium = new PremiumHomepageBuilder().build(homepage)
  const html = renderToStaticMarkup(<PremiumHomepage homepage={premium} />)
  assert.doesNotMatch(html, /<img[^>]+src=""/)
})

test("vehicle card uses the real primary image when media exists", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
  try {
    const mapped = mapPublicVehicle(vehicleRecord(), [imageRecord()])
    const card = buildVehiclePublicCard(mapped, buildPublicHomepage(garage, [mapped]).garage)
    assert.ok(card.image?.url)
    assert.match(card.image.url, /vehicle-images/)
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
  }
})

test("vehicle card without media renders an intentional empty state", () => {
  const mapped = mapPublicVehicle(vehicleRecord(), [])
  const card = buildVehiclePublicCard(mapped, buildPublicHomepage(garage, [mapped]).garage)
  assert.equal(card.image, null)
  const html = renderToStaticMarkup(<PremiumVehicleCard vehicle={card} />)
  assert.match(html, /Photo à venir/)
  assert.doesNotMatch(html, /<img/)
})

test("missing body type stays hidden instead of showing a heavy fallback label", () => {
  const mapped = mapPublicVehicle(vehicleRecord({ body_type: null }), [])
  const card = buildVehiclePublicCard(mapped, buildPublicHomepage(garage, [mapped]).garage)
  assert.equal(card.bodyType, null)
  const html = renderToStaticMarkup(<PremiumVehicleCard vehicle={card} />)
  assert.doesNotMatch(html, /CARROSSERIE|Carrosserie non renseignée/i)
})

test("MG MGB display casing and unknown mileage stay truthful", () => {
  const mapped = mapPublicVehicle(vehicleRecord(), [])
  assert.equal(formatPublicVehicleDisplayName(mapped.make, mapped.model), "MG MGB")
  const card = buildVehiclePublicCard(mapped, buildPublicHomepage(garage, [mapped]).garage)
  assert.equal(card.name, "MG MGB")
  assert.equal(card.mileage, "Kilométrage non renseigné")
  assert.equal(formatVehicleMileage(mapped.mileageKm), "Kilométrage non renseigné")
})

test("header and floating dock expose the garage phone and two distinct actions", () => {
  const premium = new PremiumHomepageBuilder().build(buildPublicHomepage(garage, []))
  const html = renderToStaticMarkup(<PremiumHomepage homepage={premium} />)
  assert.match(html, /href="tel:0327000000"/)
  assert.match(html, /Appeler le garage/)
  assert.match(html, /href="\/g\/sap\/stock"/)
  assert.match(html, /Découvrir nos véhicules/)
  assert.match(html, /Prendre rendez-vous/)
  assert.match(html, /Nous contacter/)
  assert.equal(premium.hero.actions[0]?.href, "/g/sap/stock")
  assert.equal(premium.contactActions[0]?.label, "Appeler le garage")
  assert.equal(premium.contactActions[0]?.href, "tel:0327000000")
  const emptyServices = { ...garage, serviceConfigurations: [] }
  const sparse = new PremiumHomepageBuilder().build(buildPublicHomepage(emptyServices, []))
  assert.equal(sparse.appointmentActions.length, 0)
  const floating = renderToStaticMarkup(<PremiumCustomerActions homepage={sparse} />)
  assert.match(floating, /Prendre rendez-vous/)
  assert.match(floating, /Nous contacter/)
  assert.match(floating, /Appeler le garage/)
  assert.match(floating, /href="tel:0327000000"/)
})

test("header uses the garage logo when a resolvable logo URL exists", () => {
  const branded = {
    ...garage,
    branding: { ...garage.branding, logoUrl: "/sap-logo.png" },
  }
  const html = renderToStaticMarkup(<PremiumHomepage homepage={new PremiumHomepageBuilder().build(buildPublicHomepage(branded, []))} />)
  assert.match(html, /sap-logo\.png/)
  assert.match(html, /alt="Service Auto aux Particuliers"/)
  assert.doesNotMatch(html, />Service Auto aux Particuliers<\/span>/)
})

test("Next Image allows Supabase storage hosts and bypasses the Vercel optimizer for remote media", () => {
  const config = readFileSync("next.config.ts", "utf8")
  const media = readFileSync("src/features/public-site/components/PublicMediaImage.tsx", "utf8")
  assert.match(config, /hostname: "\*\.supabase\.co"/)
  assert.match(config, /pathname: "\/storage\/v1\/object\/public\/\*\*"/)
  assert.match(media, /unoptimized=\{remote\}/)
  assert.match(media, /onError/)
  assert.match(media, /Photo à venir/)
})

test("sticky CTA keeps destinations and accessible labels with professional icons", () => {
  const premium = new PremiumHomepageBuilder().build(buildPublicHomepage(garage, [liveVehicle()]))
  const html = renderToStaticMarkup(<PremiumCustomerActions homepage={premium} />)
  assert.match(html, /Prendre rendez-vous/)
  assert.match(html, /Nous contacter/)
  assert.match(html, /Actions rapides/)
  assert.match(html, /Voir \/ essayer un véhicule/)
  assert.match(html, /Formulaire de contact/)
  assert.match(html, /href="\/g\/sap\/contact\?project=test-drive"/)
  assert.match(html, /href="\/g\/sap\/contact"/)
  assert.match(html, /lucide-calendar-days/)
  assert.match(html, /lucide-message-circle/)
})

test("Next Image always allows Supabase storage hosts on Vercel", () => {
  const source = readFileSync("next.config.ts", "utf8")
  assert.match(source, /hostname: "\*\.supabase\.co"/)
  assert.match(source, /pathname: "\/storage\/v1\/object\/public\/\*\*"/)
  assert.match(source, /NEXT_PUBLIC_SUPABASE_URL/)
  assert.doesNotMatch(source, /remotePatterns: supabaseUrl\s*\?/)
})

test("public site source does not fall back to demo vehicle fixtures", () => {
  const repository = readFileSync("src/features/live-stock/data/public-vehicle-repository.ts", "utf8")
  const mapper = readFileSync("src/features/live-stock/mappers/public-vehicle-mapper.ts", "utf8")
  assert.doesNotMatch(repository, /fixture|demo|placeholder\.jpg|unsplash/i)
  assert.doesNotMatch(mapper, /fixture|demo|placeholder\.jpg|unsplash/i)
  assert.match(mapper, /resolveVehicleImagePublicUrl/)
})

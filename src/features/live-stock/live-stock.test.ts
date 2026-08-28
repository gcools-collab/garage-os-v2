import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  buildPublicCatalog,
  buildPublicHomepage,
  buildPublicVehicleDetail,
} from "./builders"
import {
  buildVehicleSlug,
  isVehiclePubliclyVisible,
  resolveVehicleCoverPhoto,
  selectRecentVehicles,
  validateVehicleForPublication,
} from "./engine"
import { mapPublicVehicle, mapPublicVehicleImages } from "./mappers"
import type {
  LiveStockVehicle,
  PublicGarageContext,
  PublicVehicleImageRecord,
  PublicVehicleRecord,
} from "./types"

const garage: PublicGarageContext = {
  garageId: "garage-a",
  garageSlug: "garage-a",
  displayName: "Garage A",
  status: "ACTIVE",
  basePath: "/g/garage-a",
  liveTheme: {
    key: "default", label: "Default", description: "", mode: "dark", status: "stable",
    tokens: {
      background: "#17191D", foreground: "#FFFFFF", mutedForeground: "#AAAAAA",
      surface: "#202020", surfaceElevated: "#252525", surfaceMuted: "#303030",
      border: "#444444", borderStrong: "#666666", primary: "#FFFFFF",
      primaryForeground: "#000000", primaryHover: "#EEEEEE", secondary: "#333333",
      secondaryForeground: "#FFFFFF", accent: "#FFFFFF", accentForeground: "#000000",
      success: "#008000", warning: "#A06000", danger: "#B00020", focusRing: "#FFFFFF",
      overlay: "rgba(0,0,0,.5)", shadowColor: "rgba(0,0,0,.5)",
    },
    preview: { background: "#17191D", surface: "#202020", primary: "#FFFFFF", accent: "#FFFFFF" },
  },
  branding: {
    displayName: "Garage A", legalName: null, logoUrl: null, faviconUrl: null,
    phone: null, formattedPhone: null, email: null, formattedAddress: "Paris",
    shortDescription: "Véhicules sélectionnés.", socialLinks: {
      facebookUrl: null, instagramUrl: null,
    },
    themeKey: "default", colors: { primary: null, secondary: null, accent: null },
  },
}

function vehicle(overrides: Partial<LiveStockVehicle> = {}): LiveStockVehicle {
  return {
    id: "aaaaaaaa-1111-2222-3333-444444444444",
    garageId: "garage-a",
    slug: "peugeot-308-2022-aaaaaaaa",
    make: "Peugeot",
    model: "308",
    version: "GT",
    title: "Peugeot 308 GT",
    year: 2022,
    mileageKm: 35_000,
    fuelType: "Essence",
    transmission: "Automatique",
    bodyType: "Berline",
    powerHp: 130,
    fiscalPower: 7,
    doors: 5,
    seats: 5,
    color: "Bleu",
    registrationDate: "2022-04-01",
    priceCents: 2_499_000,
    previousPriceCents: null,
    description: "Une Peugeot 308 disponible immédiatement.",
    equipment: [],
    status: "PUBLISHED",
    publicationStatus: "PUBLISHED",
    publishedAt: "2026-07-20T10:00:00.000Z",
    soldAt: null,
    createdAt: "2026-07-10T10:00:00.000Z",
    updatedAt: "2026-07-20T10:00:00.000Z",
    co2Emissions: 120,
    critAir: 1,
    euroStandard: "Euro 6",
    ownersCount: 1,
    photos: [{
      id: "photo-1", path: "garage-a/aaaaaaaa-1111-2222-3333-444444444444/main.webp",
      url: "https://example.test/main.webp", alt: "Peugeot 308", position: 0,
      isCover: true, width: null, height: null,
    }],
    ...overrides,
  }
}

test("un véhicule publié du garage actif est visible", () => {
  assert.equal(isVehiclePubliclyVisible({ vehicle: vehicle(), garage, now: new Date("2026-07-29") }), true)
})

for (const [label, overrides] of [
  ["brouillon", { publicationStatus: "DRAFT" }],
  ["dépublié", { publicationStatus: "UNPUBLISHED" }],
  ["vendu", { status: "SOLD" }],
  ["archivé", { status: "ARCHIVED" }],
] as const) {
  test(`un véhicule ${label} est invisible`, () => {
    assert.equal(isVehiclePubliclyVisible({
      vehicle: vehicle(overrides),
      garage,
      now: new Date("2026-07-29"),
    }), false)
  })
}

test("un garage voisin et un site désactivé restent invisibles", () => {
  assert.equal(isVehiclePubliclyVisible({ vehicle: vehicle({ garageId: "garage-b" }), garage }), false)
  assert.equal(isVehiclePubliclyVisible({
    vehicle: vehicle(),
    garage: { ...garage, status: "DISABLED" },
  }), false)
})

test("la photo principale puis la première photo sont résolues sans mutation", () => {
  const photos = [
    { ...vehicle().photos[0], id: "second", position: 1, isCover: false },
    { ...vehicle().photos[0], id: "cover", position: 2, isCover: true },
  ]
  const before = structuredClone(photos)
  assert.equal(resolveVehicleCoverPhoto(photos)?.id, "cover")
  assert.deepEqual(photos, before)
  assert.equal(resolveVehicleCoverPhoto([]), null)
})

test("le slug est stable et évite les collisions par suffixe d'identifiant", () => {
  const first = buildVehicleSlug({ id: "aaaaaaaa-0000", make: "Citroën", model: "C3", year: 2022 })
  const second = buildVehicleSlug({ id: "bbbbbbbb-0000", make: "Citroën", model: "C3", year: 2022 })
  assert.equal(first, "citroen-c3-2022-aaaaaaaa")
  assert.notEqual(first, second)
})

test("la validation de publication expose les manques sans données internes", () => {
  const complete = validateVehicleForPublication(vehicle())
  assert.equal(complete.canPublish, true)
  const incomplete = validateVehicleForPublication(vehicle({
    priceCents: null, description: null, photos: [],
  }))
  assert.deepEqual(incomplete.missingFields, ["Prix de vente", "Description", "Photo"])
})

test("le mapper convertit le prix en centimes et rejette les photos d'un autre tenant", () => {
  const previous = process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
  try {
    const record: PublicVehicleRecord = {
      id: vehicle().id, garage_id: "garage-a", live_slug: vehicle().slug,
      brand: "Peugeot", model: "308", version: "GT", year: 2022, mileage: 35000,
      fuel: "Essence", gearbox: "Automatique", body_type: "Berline", power_din: 130,
      fiscal_power: 7, doors: 5, seats: 5, color: "Bleu",
      first_registration_date: "2022-04-01", selling_price: 24990,
      description: "Description", status: "PUBLISHED", publication_status: "PUBLISHED",
      published_at: "2026-07-20T10:00:00.000Z", created_at: "2026-07-10T10:00:00.000Z",
      updated_at: "2026-07-20T10:00:00.000Z", co2_emissions: 120, crit_air: 1,
      euro_standard: "Euro 6", owners_count: 1,
    }
    const valid: PublicVehicleImageRecord = {
      id: "valid", vehicle_id: record.id, garage_id: "garage-a",
      storage_path: `garage-a/${record.id}/photo.webp`, is_primary: true,
      display_order: 1,
      created_at: "2026-07-20T10:00:00.000Z",
    }
    const foreign = { ...valid, id: "foreign", garage_id: "garage-b" }
    assert.equal(mapPublicVehicleImages({ vehicle: record, images: [foreign, valid] }).length, 1)
    assert.equal(mapPublicVehicle(record, [valid]).priceCents, 2_499_000)
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previous
  }
})

test("homepage, catalogue, fiche et liens restent tenant-scoped", () => {
  const vehicles = [vehicle()]
  const homepage = buildPublicHomepage({ garage, vehicles, now: new Date("2026-07-29") })
  const catalog = buildPublicCatalog({ garage, vehicles, query: {}, now: new Date("2026-07-29") })
  const detail = buildPublicVehicleDetail({
    garage, vehicles, vehicleSlug: vehicle().slug, now: new Date("2026-07-29"),
  })
  assert.equal(homepage.featuredVehicles.length, 1)
  assert.equal(catalog.resultCount, 1)
  assert.match(catalog.vehicles[0].href, /^\/g\/garage-a\/vehicles\//)
  assert.equal(detail?.catalogHref, "/g/garage-a/vehicles")
  assert.equal(buildPublicVehicleDetail({
    garage, vehicles, vehicleSlug: "inconnu", now: new Date("2026-07-29"),
  }), null)
})

test("les nouveautés utilisent publishedAt et les collections vides disparaissent", () => {
  assert.equal(selectRecentVehicles([vehicle()], new Date("2026-07-29"), 30).length, 1)
  assert.equal(selectRecentVehicles([
    vehicle({ publishedAt: "2025-01-01T00:00:00.000Z" }),
  ], new Date("2026-07-29"), 30).length, 0)
  const homepage = buildPublicHomepage({
    garage,
    vehicles: [vehicle({ transmission: "Manuelle", priceCents: 2_499_000, mileageKm: 100_000 })],
    now: new Date("2027-07-29"),
  })
  assert.equal(homepage.collections.length, 0)
})

test("les lectures publiques utilisent des projections explicites", () => {
  const repository = readFileSync("src/features/live-stock/data/public-vehicle-repository.ts", "utf8")
  const migration = readFileSync("supabase/migrations/20260729000029_connect_live_stock.sql", "utf8")
  assert.doesNotMatch(repository, /select\(\s*["'`]?\*|purchase_price|notes|prep_cost/)
  assert.match(migration, /where g\.live_enabled/)
  assert.match(migration, /publication_status = 'PUBLISHED'/)
  assert.doesNotMatch(migration, /on public\.vehicles[\s\S]{0,100}using\s*\(\s*true\s*\)/i)
})

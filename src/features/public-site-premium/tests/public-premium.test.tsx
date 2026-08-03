import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import type { LiveStockVehicle, PublicGarageContext } from "@/features/live-stock"
import { buildPublicHomepage } from "@/features/public-site/builders"
import { getLiveThemeDefinition } from "@/features/theme"
import { PremiumHomepageBuilder } from "../builders"
import { PremiumHomepage, PremiumAssetGallery } from "../components"

const garage = (theme: "default" | "black-yellow" | "midnight" = "default"): PublicGarageContext => ({ garageId: "garage-1", garageSlug: "premium-cars", displayName: "Premium Cars", status: "ACTIVE", basePath: "/g/premium-cars", liveTheme: getLiveThemeDefinition(theme), branding: { displayName: "Premium Cars", legalName: "Premium Cars SAS", logoUrl: null, faviconUrl: null, phone: "0327000000", formattedPhone: "03 27 00 00 00", email: "contact@premium.test", formattedAddress: "1 rue Automobile, Raismes", shortDescription: "Une sélection automobile exigeante.", socialLinks: { facebookUrl: null, instagramUrl: null }, themeKey: theme, colors: { primary: null, secondary: null, accent: null } } })
const TEST_IMAGE = "/test-vehicle.jpg"
const vehicle = (id: string): LiveStockVehicle => ({ id, garageId: "garage-1", slug: `bmw-m3-${id}`, make: "BMW", model: "M3", version: "Competition", title: "BMW M3 Competition", year: 2020, mileageKm: 45000, fuelType: "Essence", transmission: "Automatique", bodyType: "Berline", powerHp: 510, fiscalPower: 42, doors: 4, seats: 5, color: "Noir", registrationDate: "2020-06-01", priceCents: 7000000, previousPriceCents: null, description: "BMW M3 disponible.", equipment: [], status: "PUBLISHED", publicationStatus: "PUBLISHED", publishedAt: "2026-07-20T10:00:00.000Z", soldAt: null, createdAt: "2026-07-20T10:00:00.000Z", updatedAt: "2026-07-20T10:00:00.000Z", co2Emissions: 220, critAir: 1, euroStandard: "Euro 6", ownersCount: 1, photos: [{ id: `photo-${id}`, path: `${id}.webp`, url: TEST_IMAGE, alt: "BMW M3 noire", position: 0, isCover: true, width: 1600, height: 1200 }] })

test("builder prepares every premium homepage section", () => {
  const premium = new PremiumHomepageBuilder().build(buildPublicHomepage(garage(), [vehicle("1"), vehicle("2")]))
  assert.equal(premium.featured.vehicle?.name, "BMW M3")
  assert.equal(premium.latest.vehicles.length, 2)
  assert.equal(premium.services.items.length, 3)
  assert.equal(premium.whyUs.items.length, 3)
  assert.equal(premium.reviews.available, false)
  assert.equal(premium.animation.reducedMotion, true)
})

test("homepage renders hero, search, conversion and contact CTAs", () => {
  const html = renderToStaticMarkup(<PremiumHomepage homepage={new PremiumHomepageBuilder().build(buildPublicHomepage(garage(), [vehicle("1")]))} />)
  assert.match(html, /Voir le stock/)
  assert.match(html, /name="brand"/)
  assert.match(html, /name="model"/)
  assert.match(html, /name="maxPrice"/)
  assert.match(html, /name="maxMileage"/)
  assert.match(html, /Demander une reprise/)
  assert.match(html, /Étudier mon financement/)
  assert.match(html, /Navigation principale/)
  assert.match(html, /Actions rapides/)
})

test("premium vehicle cards use responsive Next images and accessible links", () => {
  const html = renderToStaticMarkup(<PremiumHomepage homepage={new PremiumHomepageBuilder().build(buildPublicHomepage(garage(), [vehicle("1")]))} />)
  assert.match(html, /sizes="\(max-width: 1024px\) 100vw, 65vw"/)
  assert.match(html, /aria-label="Voir BMW M3"/)
  assert.match(html, /Découvrir ce véhicule/)
})

for (const theme of ["default", "black-yellow", "midnight"] as const) {
  test(`supports the ${theme} branding theme without local colors`, () => {
    const html = renderToStaticMarkup(<PremiumHomepage homepage={new PremiumHomepageBuilder().build(buildPublicHomepage(garage(theme), [vehicle("1")]))} />)
    assert.match(html, new RegExp(`data-live-theme="${theme}"`))
  })
}

test("immersive gallery exposes keyboard, zoom and fullscreen controls", () => {
  const image = { id: "image-1", alt: "BMW M3", caption: null, source: { url: TEST_IMAGE }, placeholder: { dominantColor: null, blurHash: null }, badge: null, status: "READY" as const }
  const html = renderToStaticMarkup(<PremiumAssetGallery gallery={{ empty: false, cover: image, assets: [image], thumbnails: [] }} />)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /Agrandir l’image/)
  assert.match(html, /Afficher en plein écran/)
  assert.match(html, /aria-live="polite"/)
})

test("components contain no Supabase, business sorting or hard-coded palette", () => {
  const files = ["PremiumHomepage.tsx", "PremiumVehicleCard.tsx", "PremiumQuickSearch.tsx", "PremiumSections.tsx", "PremiumAssetGallery.tsx"]
  for (const file of files) {
    const source = readFileSync(`src/features/public-site-premium/components/${file}`, "utf8")
    assert.doesNotMatch(source, /supabase|\.sort\(|#[0-9a-f]{3,8}|bg-black|text-white/i)
  }
})

test("CSS animation contract respects reduced motion", () => {
  const css = readFileSync("src/features/public-site-premium/animations/premium-motion.css", "utf8")
  assert.match(css, /prefers-reduced-motion: reduce/)
  assert.match(css, /@media \(hover: hover\)/)
  assert.match(css, /stagger/)
})

test("SEO route preserves AutoDealer JSON-LD, canonical, OpenGraph and Twitter", () => {
  const route = readFileSync("src/app/(public)/g/[garageSlug]/page.tsx", "utf8")
  assert.match(route, /application\/ld\+json/)
  assert.match(route, /alternates: \{ canonical/)
  assert.match(route, /openGraph/)
  assert.match(route, /twitter/)
})

test("vehicle detail keeps classic gallery and integrated 360 viewer", () => {
  const detail = readFileSync("src/features/public-site/vehicle-detail/components/PremiumVehicleDetailPage.tsx", "utf8")
  assert.match(detail, /VehicleGallerySection/)
  assert.match(detail, /Vehicle360ViewerClient/)
  assert.match(detail, /VehicleCTASection cta=\{detail\.cta\} mobile/)
})

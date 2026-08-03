import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { BrandingSettingsForm } from "./components"
import { buildGarageBrandingUpdateInput } from "./components/BrandingSettingsForm"
import { updateGarageBrandingWithDependencies } from "./data/update-garage-branding"
import { createBrandingInitials, resolveGarageBranding } from "./engine"
import {
  buildGarageBrandingSettingsViewModel,
  buildGarageBrandingShellViewModel,
  buildGarageLiveBrandingViewModel,
} from "./presentation"
import type {
  GarageBrandingRecord,
  GarageBrandingUpdateInput,
  GarageBrandingUpdateResult,
} from "./types"
import type { ActiveGarageSession } from "@/features/tenant"
import { LiveThemeSelector, listSelectableLiveThemes } from "@/features/theme"

const GARAGE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const OTHER_GARAGE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function brandingRecord(overrides: Partial<GarageBrandingRecord> = {}): GarageBrandingRecord {
  return {
    garage_id: GARAGE_ID,
    display_name: "S.A.P",
    legal_name: "Service Auto Particuliers",
    logo_path: `${GARAGE_ID}/logo.webp`,
    favicon_path: `${GARAGE_ID}/favicon.png`,
    phone: "03 27 00 00 00",
    email: "contact@example.fr",
    website_url: "https://example.fr",
    address_line1: "1 rue du Garage",
    address_line2: null,
    postal_code: "59590",
    city: "Raismes",
    country_code: "FR",
    short_description: "Véhicules sélectionnés avec exigence.",
    facebook_url: "https://facebook.com/example",
    instagram_url: "https://instagram.com/example",
    theme_key: "black-yellow",
    primary_color: "#101010",
    secondary_color: "#FFFFFF",
    accent_color: "#FFD400",
    ...overrides,
  }
}

function session(role: string): ActiveGarageSession {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    userEmail: "owner@example.com",
    userDisplayName: "Owner",
    garageId: GARAGE_ID,
    garageName: "Garage source",
    garageSlug: "garage-source",
    memberRole: role,
    availableGarages: [],
    requiresGarageSelection: false,
    requiresOnboarding: false,
  }
}

const validInput: GarageBrandingUpdateInput = {
  displayName: "S.A.P",
  legalName: "Service Auto Particuliers",
  email: "CONTACT@EXAMPLE.FR",
  websiteUrl: "https://example.fr",
  countryCode: "fr",
  primaryColor: "#ffd400",
  themeKey: "black-yellow",
}

function recordFromInput(garageId: string, input: GarageBrandingUpdateInput) {
  return brandingRecord({
    garage_id: garageId,
    display_name: input.displayName,
    legal_name: input.legalName ?? null,
    email: input.email ?? null,
    website_url: input.websiteUrl ?? null,
    country_code: input.countryCode ?? "FR",
    primary_color: input.primaryColor ?? null,
    theme_key: input.themeKey ?? "default",
  })
}

test("builds editable branding values from the current FormData", () => {
  const formData = new FormData()
  formData.set("displayName", "S.A.P")
  formData.set("themeKey", "black-yellow")
  formData.set("primaryColor", "#111111")
  formData.set("secondaryColor", "#222222")
  formData.set("accentColor", "#FFD400")

  const input = buildGarageBrandingUpdateInput(formData)

  assert.equal(input.themeKey, "black-yellow")
  assert.equal(input.primaryColor, "#111111")
  assert.equal(input.secondaryColor, "#222222")
  assert.equal(input.accentColor, "#FFD400")
})

test("uses the newly selected theme instead of an initial theme value", () => {
  const formData = new FormData()
  formData.set("displayName", "S.A.P")
  formData.set("themeKey", "midnight")

  assert.equal(buildGarageBrandingUpdateInput(formData).themeKey, "midnight")
})

test("résout un branding complet normalisé", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage source" },
    record: brandingRecord(),
  })

  assert.equal(branding.displayName, "S.A.P")
  assert.equal(branding.contact.websiteUrl, "https://example.fr/")
  assert.equal(branding.colors.accent, "#FFD400")
  assert.equal(branding.themeKey, "black-yellow")
})

test("retourne un branding fonctionnel sans ligne configurée", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage Martin" },
    record: null,
  })

  assert.equal(branding.displayName, "Garage Martin")
  assert.equal(branding.themeKey, "default")
  assert.equal(branding.contact.phone, null)
  assert.equal(branding.logoPath, null)
})

test("remplace un displayName vide par le nom du garage", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage Martin" },
    record: brandingRecord({ display_name: "  " }),
  })
  assert.equal(branding.displayName, "Garage Martin")
})

test("accepte une couleur hexadécimale et ignore une couleur invalide", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage" },
    record: brandingRecord({ primary_color: "#aabbcc", accent_color: "yellow" }),
  })
  assert.equal(branding.colors.primary, "#AABBCC")
  assert.equal(branding.colors.accent, null)
})

test("expose uniquement les URLs http ou https valides", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage" },
    record: brandingRecord({
      website_url: "https://garage.example/path",
      facebook_url: "javascript:alert(1)",
      instagram_url: "pas-une-url",
    }),
  })
  assert.equal(branding.contact.websiteUrl, "https://garage.example/path")
  assert.equal(branding.socialLinks.facebookUrl, null)
  assert.equal(branding.socialLinks.instagramUrl, null)
})

test("normalise les données nulles sans mutation et reste déterministe", () => {
  const record = brandingRecord({
    legal_name: null,
    phone: null,
    email: null,
    address_line1: null,
    short_description: null,
  })
  const before = structuredClone(record)
  const first = resolveGarageBranding({ garage: { id: GARAGE_ID, name: "Garage" }, record })
  const second = resolveGarageBranding({ garage: { id: GARAGE_ID, name: "Garage" }, record })
  assert.deepEqual(first, second)
  assert.deepEqual(record, before)
})

test("génère des initiales stables", () => {
  assert.equal(createBrandingInitials("S.A.P"), "SAP")
  assert.equal(createBrandingInitials("Service Auto Particuliers"), "SAP")
  assert.equal(createBrandingInitials("Garage Martin"), "GM")
  assert.equal(createBrandingInitials("Auto"), "A")
  assert.equal(createBrandingInitials("  "), "")
})

for (const role of ["owner", "admin"]) {
  test(`autorise la mise à jour pour le rôle ${role}`, async () => {
    let upsertGarageId: string | null = null
    const result = await updateGarageBrandingWithDependencies(validInput, {
      getSession: async () => session(role),
      upsert: async (garageId, input) => {
        upsertGarageId = garageId
        return { data: recordFromInput(garageId, input), error: null }
      },
    })
    assert.equal(result.success, true)
    assert.equal(upsertGarageId, GARAGE_ID)
    if (result.success) {
      assert.equal(result.branding.contact.email, "contact@example.fr")
      assert.equal(result.branding.colors.primary, "#FFD400")
      assert.equal(result.branding.themeKey, "black-yellow")
    }
  })
}

test("refuse un rôle insuffisant avant l'upsert", async () => {
  let called = false
  const result = await updateGarageBrandingWithDependencies(validInput, {
    getSession: async () => session("member"),
    upsert: async () => {
      called = true
      return { data: brandingRecord(), error: null }
    },
  })
  assert.deepEqual(result, {
    success: false,
    code: "FORBIDDEN",
    message: "Vous ne pouvez pas modifier le branding de ce garage.",
  })
  assert.equal(called, false)
})

test("ignore tout garageId externe et utilise le garage de session", async () => {
  let upsertGarageId: string | null = null
  const maliciousInput = { ...validInput, garageId: OTHER_GARAGE_ID }
  await updateGarageBrandingWithDependencies(maliciousInput, {
    getSession: async () => session("owner"),
    upsert: async (garageId, input) => {
      upsertGarageId = garageId
      return { data: recordFromInput(garageId, input), error: null }
    },
  })
  assert.equal(upsertGarageId, GARAGE_ID)
})

for (const [name, input] of [
  ["email", { ...validInput, email: "email-invalide" }],
  ["URL", { ...validInput, websiteUrl: "javascript:alert(1)" }],
  ["couleur", { ...validInput, primaryColor: "yellow" }],
  ["thème", { ...validInput, themeKey: "valeur-libre" }],
] as const) {
  test(`refuse une valeur ${name} invalide`, async () => {
    const result = await updateGarageBrandingWithDependencies(input, {
      getSession: async () => session("owner"),
      upsert: async () => ({ data: brandingRecord(), error: null }),
    })
    assert.equal(result.success, false)
    if (!result.success) assert.equal(result.code, "VALIDATION_ERROR")
  })
}

test("utilise le même upsert pour une création puis une mise à jour", async () => {
  let storedDisplayName: string | null = null
  const dependencies = {
    getSession: async () => session("owner"),
    upsert: async (garageId: string, input: GarageBrandingUpdateInput) => {
      const stored = recordFromInput(garageId, input)
      storedDisplayName = stored.display_name
      return { data: stored, error: null }
    },
  }
  const created = await updateGarageBrandingWithDependencies(validInput, dependencies)
  const updated = await updateGarageBrandingWithDependencies({ ...validInput, displayName: "Nouveau nom" }, dependencies)
  assert.equal(created.success, true)
  assert.equal(updated.success, true)
  assert.equal(storedDisplayName, "Nouveau nom")
})

test("prépare les ViewModels shell et Live sans logo générique", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Service Auto Particuliers" },
    record: brandingRecord({ logo_path: null, favicon_path: null }),
  })
  const media = { logoUrl: null, faviconUrl: null }
  const shell = buildGarageBrandingShellViewModel(branding, media)
  const live = buildGarageLiveBrandingViewModel(branding, media)
  assert.equal(shell.displayName, "S.A.P")
  assert.equal(shell.initials, "SAP")
  assert.equal(shell.logoUrl, null)
  assert.equal(live.legalName, "Service Auto Particuliers")
  assert.equal(live.formattedAddress, "1 rue du Garage, 59590 Raismes")
})

test("rend les paramètres avec un seul h1 et le vrai displayName", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage source" },
    record: brandingRecord(),
  })
  const settings = buildGarageBrandingSettingsViewModel({ branding, canEdit: true })
  const updateBranding = async (): Promise<GarageBrandingUpdateResult> => ({ success: true, branding })
  const html = renderToStaticMarkup(
    <main>
      <h1>{settings.title}</h1>
      <BrandingSettingsForm
        settings={settings}
        updateBranding={updateBranding}
        themeSelector={
          <LiveThemeSelector
            themes={listSelectableLiveThemes()}
            selectedThemeKey="black-yellow"
            disabled={false}
          />
        }
      />
    </main>
  )
  assert.equal((html.match(/<h1/g) ?? []).length, 1)
  assert.match(html, /S\.A\.P/)
  assert.doesNotMatch(html, /Garage Martin/)
})

test("persists successive theme changes through the repository dependency", async () => {
  let stored = brandingRecord({ theme_key: "default" })
  const dependencies = {
    getSession: async () => session("owner"),
    upsert: async (garageId: string, input: GarageBrandingUpdateInput) => {
      stored = recordFromInput(garageId, input)
      return { data: stored, error: null }
    },
  }

  const blackYellow = await updateGarageBrandingWithDependencies(
    { ...validInput, themeKey: "black-yellow" },
    dependencies
  )
  assert.equal(blackYellow.success && blackYellow.branding.themeKey, "black-yellow")
  assert.equal(stored.theme_key, "black-yellow")

  const midnight = await updateGarageBrandingWithDependencies(
    { ...validInput, themeKey: "midnight" },
    dependencies
  )
  assert.equal(midnight.success && midnight.branding.themeKey, "midnight")
  assert.equal(stored.theme_key, "midnight")
})

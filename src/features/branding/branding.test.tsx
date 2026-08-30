import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
  GarageLogoActionResult,
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
  const settings = buildGarageBrandingSettingsViewModel({
    branding,
    canEdit: true,
    logoUrl: "https://images.example/aaaaaaaa/logo.webp",
  })
  const updateBranding = async (): Promise<GarageBrandingUpdateResult> => ({ success: true, branding })
  const uploadLogo = async (): Promise<GarageLogoActionResult> => ({ success: true, logoUrl: null })
  const removeLogo = async (): Promise<GarageLogoActionResult> => ({ success: true, logoUrl: null })
  const html = renderToStaticMarkup(
    <main>
      <h1>{settings.title}</h1>
      <BrandingSettingsForm
        settings={settings}
        updateBranding={updateBranding}
        uploadLogo={uploadLogo}
        removeLogo={removeLogo}
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
  assert.match(html, /Logo du garage/)
  assert.match(html, /accept="image\/png,image\/webp,image\/jpeg"/)
  assert.match(html, /aaaaaaaa\/logo\.webp/)
  assert.match(html, /Supprimer le logo/)
})

test("sans logo enregistré, le champ Paramètres affiche le repli et masque la suppression", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage source" },
    record: brandingRecord({ logo_path: null }),
  })
  const settings = buildGarageBrandingSettingsViewModel({ branding, canEdit: true, logoUrl: null })
  const updateBranding = async (): Promise<GarageBrandingUpdateResult> => ({ success: true, branding })
  const uploadLogo = async (): Promise<GarageLogoActionResult> => ({ success: true, logoUrl: null })
  const removeLogo = async (): Promise<GarageLogoActionResult> => ({ success: true, logoUrl: null })
  const html = renderToStaticMarkup(
    <BrandingSettingsForm
      settings={settings}
      updateBranding={updateBranding}
      uploadLogo={uploadLogo}
      removeLogo={removeLogo}
      themeSelector={<LiveThemeSelector themes={listSelectableLiveThemes()} selectedThemeKey="default" disabled={false} />}
    />
  )
  assert.match(html, /Pas de logo/)
  assert.doesNotMatch(html, /Supprimer le logo/)
})

test("lorsque la modification est interdite, le téléversement et la suppression du logo sont désactivés", () => {
  const branding = resolveGarageBranding({
    garage: { id: GARAGE_ID, name: "Garage source" },
    record: brandingRecord(),
  })
  const settings = buildGarageBrandingSettingsViewModel({
    branding,
    canEdit: false,
    logoUrl: "https://images.example/aaaaaaaa/logo.webp",
  })
  const updateBranding = async (): Promise<GarageBrandingUpdateResult> => ({ success: true, branding })
  const uploadLogo = async (): Promise<GarageLogoActionResult> => ({ success: true, logoUrl: null })
  const removeLogo = async (): Promise<GarageLogoActionResult> => ({ success: true, logoUrl: null })
  const html = renderToStaticMarkup(
    <BrandingSettingsForm
      settings={settings}
      updateBranding={updateBranding}
      uploadLogo={uploadLogo}
      removeLogo={removeLogo}
      themeSelector={<LiveThemeSelector themes={listSelectableLiveThemes()} selectedThemeKey="default" disabled />}
    />
  )
  assert.doesNotMatch(html, /Supprimer le logo/)
  assert.match(html, /<input[^>]*type="file"[^>]*disabled/)
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

// --- Garage logo: validation --------------------------------------------------------------

function pngBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10], 0)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  bytes.set([73, 72, 68, 82], 12)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

function jpegBytes(width: number, height: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ])
}

function webpBytes(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(30)
  bytes.set([0x52, 0x49, 0x46, 0x46], 0)
  bytes.set([0x57, 0x45, 0x42, 0x50], 8)
  bytes.set([0x56, 0x50, 0x38, 0x58], 12)
  const w = width - 1
  const h = height - 1
  bytes[24] = w & 0xff
  bytes[25] = (w >> 8) & 0xff
  bytes[26] = (w >> 16) & 0xff
  bytes[27] = h & 0xff
  bytes[28] = (h >> 8) & 0xff
  bytes[29] = (h >> 16) & 0xff
  return bytes
}

test("validateLogoFile accepte PNG/JPEG/WebP et refuse type ou taille invalides", async () => {
  const { validateLogoFile, MAX_LOGO_FILE_SIZE } = await import("./validation")
  assert.equal(validateLogoFile({ name: "logo.png", type: "image/png", size: 1024 }), null)
  assert.equal(validateLogoFile({ name: "logo.jpg", type: "image/jpeg", size: 1024 }), null)
  assert.equal(validateLogoFile({ name: "logo.webp", type: "image/webp", size: 1024 }), null)
  assert.match(validateLogoFile({ name: "logo.svg", type: "image/svg+xml", size: 1024 }) ?? "", /PNG, JPEG et WebP/)
  assert.match(validateLogoFile({ name: "logo.png", type: "image/png", size: MAX_LOGO_FILE_SIZE + 1 }) ?? "", /2 Mo/)
  assert.match(validateLogoFile({ name: "", type: "image/png", size: 0 }) ?? "", /Sélectionnez/)
})

test("hasValidLogoSignature vérifie les octets réels du fichier, pas seulement son type déclaré", async () => {
  const { hasValidLogoSignature } = await import("./validation")
  assert.equal(hasValidLogoSignature("image/png", pngBytes(10, 10)), true)
  assert.equal(hasValidLogoSignature("image/jpeg", jpegBytes(10, 10)), true)
  assert.equal(hasValidLogoSignature("image/webp", webpBytes(10, 10)), true)
  assert.equal(hasValidLogoSignature("image/png", jpegBytes(10, 10)), false)
  assert.equal(hasValidLogoSignature("image/jpeg", pngBytes(10, 10)), false)
  assert.equal(hasValidLogoSignature("image/webp", pngBytes(10, 10)), false)
})

test("readLogoDimensions lit correctement la largeur et la hauteur des trois formats", async () => {
  const { readLogoDimensions } = await import("./validation")
  assert.deepEqual(readLogoDimensions("image/png", pngBytes(320, 90)), { width: 320, height: 90 })
  assert.deepEqual(readLogoDimensions("image/jpeg", jpegBytes(640, 200)), { width: 640, height: 200 })
  assert.deepEqual(readLogoDimensions("image/webp", webpBytes(512, 512)), { width: 512, height: 512 })
})

test("validateLogoDimensions refuse un logo trop petit, trop grand ou illisible", async () => {
  const { validateLogoDimensions } = await import("./validation")
  assert.equal(validateLogoDimensions({ width: 300, height: 100 }), null)
  assert.match(validateLogoDimensions({ width: 10, height: 10 }) ?? "", /au moins/)
  assert.match(validateLogoDimensions({ width: 5000, height: 200 }) ?? "", /dépasser/)
  assert.match(validateLogoDimensions(null) ?? "", /dimensions/)
})

// --- Garage logo: upload/removal actions (dependency-injected, no real Supabase call) -----

function logoFile(name: string, type: string, bytes: Uint8Array): File {
  return new File([bytes as BlobPart], name, { type })
}

test("uploadGarageLogoWithDependencies refuse une session absente, sans garage actif ou un rôle insuffisant", async () => {
  const { uploadGarageLogoWithDependencies } = await import("./data/upload-garage-logo")
  const okDependencies = {
    getSession: async () => null,
    replaceLogoObject: async () => ({ path: `${GARAGE_ID}/logo.png`, error: null }),
    persistLogoPath: async () => ({ error: null }),
    buildPublicUrl: () => "https://images.example/logo.png",
  }
  const formData = new FormData()
  formData.set("logo", logoFile("logo.png", "image/png", pngBytes(100, 100)))

  const unauthenticated = await uploadGarageLogoWithDependencies(formData, okDependencies)
  assert.equal(unauthenticated.success, false)
  assert.equal(!unauthenticated.success && unauthenticated.code, "UNAUTHENTICATED")

  const noGarage = await uploadGarageLogoWithDependencies(formData, {
    ...okDependencies,
    getSession: async () => ({ ...session("owner"), garageId: "" }),
  })
  assert.equal(!noGarage.success && noGarage.code, "NO_ACTIVE_GARAGE")

  const forbidden = await uploadGarageLogoWithDependencies(formData, {
    ...okDependencies,
    getSession: async () => session("member"),
  })
  assert.equal(!forbidden.success && forbidden.code, "FORBIDDEN")
})

test("uploadGarageLogoWithDependencies refuse un type invalide, une signature usurpée ou des dimensions hors limites", async () => {
  const { uploadGarageLogoWithDependencies } = await import("./data/upload-garage-logo")
  const dependencies = {
    getSession: async () => session("owner"),
    replaceLogoObject: async () => ({ path: `${GARAGE_ID}/logo.png`, error: null }),
    persistLogoPath: async () => ({ error: null }),
    buildPublicUrl: () => "https://images.example/logo.png",
  }

  const wrongType = new FormData()
  wrongType.set("logo", logoFile("logo.gif", "image/gif", pngBytes(100, 100)))
  const wrongTypeResult = await uploadGarageLogoWithDependencies(wrongType, dependencies)
  assert.equal(!wrongTypeResult.success && wrongTypeResult.code, "VALIDATION_ERROR")

  const spoofed = new FormData()
  spoofed.set("logo", logoFile("logo.png", "image/png", jpegBytes(100, 100)))
  const spoofedResult = await uploadGarageLogoWithDependencies(spoofed, dependencies)
  assert.equal(!spoofedResult.success && spoofedResult.code, "VALIDATION_ERROR")
  assert.match(!spoofedResult.success ? spoofedResult.message : "", /image valide/)

  const tooSmall = new FormData()
  tooSmall.set("logo", logoFile("logo.png", "image/png", pngBytes(10, 10)))
  const tooSmallResult = await uploadGarageLogoWithDependencies(tooSmall, dependencies)
  assert.equal(!tooSmallResult.success && tooSmallResult.code, "VALIDATION_ERROR")
  assert.match(!tooSmallResult.success ? tooSmallResult.message : "", /au moins/)
})

test("uploadGarageLogoWithDependencies téléverse dans {garageId}/logo.ext et persiste le chemin canonique", async () => {
  const { uploadGarageLogoWithDependencies } = await import("./data/upload-garage-logo")
  const calls: { path?: string; extension?: string; persisted?: string | null } = {}
  const dependencies = {
    getSession: async () => session("admin"),
    replaceLogoObject: async (garageId: string, _file: File, extension: string) => {
      calls.extension = extension
      calls.path = `${garageId}/logo.${extension}`
      return { path: calls.path, error: null }
    },
    persistLogoPath: async (_garageId: string, _garageName: string, logoPath: string) => {
      calls.persisted = logoPath
      return { error: null }
    },
    buildPublicUrl: (garageId: string, path: string) => `https://images.example/${garageId}/${path}`,
  }

  const formData = new FormData()
  formData.set("logo", logoFile("logo.webp", "image/webp", webpBytes(300, 100)))
  const result = await uploadGarageLogoWithDependencies(formData, dependencies)

  assert.equal(result.success, true)
  assert.equal(calls.extension, "webp")
  assert.equal(calls.path, `${GARAGE_ID}/logo.webp`)
  assert.equal(calls.persisted, `${GARAGE_ID}/logo.webp`)
  assert.equal(result.success && result.logoUrl, `https://images.example/${GARAGE_ID}/${GARAGE_ID}/logo.webp`)
})

test("uploadGarageLogoWithDependencies retourne une erreur explicite si le stockage ou la base échoue", async () => {
  const { uploadGarageLogoWithDependencies } = await import("./data/upload-garage-logo")
  const formData = new FormData()
  formData.set("logo", logoFile("logo.png", "image/png", pngBytes(200, 200)))

  const storageFailure = await uploadGarageLogoWithDependencies(formData, {
    getSession: async () => session("owner"),
    replaceLogoObject: async () => ({ path: null, error: "bucket indisponible" }),
    persistLogoPath: async () => ({ error: null }),
    buildPublicUrl: () => null,
  })
  assert.equal(!storageFailure.success && storageFailure.code, "STORAGE_ERROR")

  const databaseFailure = await uploadGarageLogoWithDependencies(formData, {
    getSession: async () => session("owner"),
    replaceLogoObject: async () => ({ path: `${GARAGE_ID}/logo.png`, error: null }),
    persistLogoPath: async () => ({ error: "colonne verrouillée" }),
    buildPublicUrl: () => null,
  })
  assert.equal(!databaseFailure.success && databaseFailure.code, "DATABASE_ERROR")
})

test("removeGarageLogoWithDependencies est idempotent quand aucun logo n'existe déjà", async () => {
  const { removeGarageLogoWithDependencies } = await import("./data/remove-garage-logo")
  let removeCalled = false
  let persistCalled = false
  const result = await removeGarageLogoWithDependencies({
    getSession: async () => session("owner"),
    getCurrentLogoPath: async () => null,
    removeLogoObject: async () => {
      removeCalled = true
      return { error: null }
    },
    persistLogoPath: async () => {
      persistCalled = true
      return { error: null }
    },
  })
  assert.equal(result.success, true)
  assert.equal(result.success && result.logoUrl, null)
  assert.equal(removeCalled, false)
  assert.equal(persistCalled, false)
})

test("removeGarageLogoWithDependencies supprime l'objet de stockage puis efface logo_path", async () => {
  const { removeGarageLogoWithDependencies } = await import("./data/remove-garage-logo")
  const calls: { removedPath?: string | null; persisted?: string | null } = {}
  const result = await removeGarageLogoWithDependencies({
    getSession: async () => session("admin"),
    getCurrentLogoPath: async () => `${GARAGE_ID}/logo.png`,
    removeLogoObject: async (_garageId: string, logoPath: string | null) => {
      calls.removedPath = logoPath
      return { error: null }
    },
    persistLogoPath: async (_garageId: string, _garageName: string, logoPath: string | null) => {
      calls.persisted = logoPath
      return { error: null }
    },
  })
  assert.equal(result.success, true)
  assert.equal(calls.removedPath, `${GARAGE_ID}/logo.png`)
  assert.equal(calls.persisted, null)
})

test("removeGarageLogoWithDependencies refuse un rôle insuffisant sans toucher au stockage", async () => {
  const { removeGarageLogoWithDependencies } = await import("./data/remove-garage-logo")
  let touched = false
  const result = await removeGarageLogoWithDependencies({
    getSession: async () => session("member"),
    getCurrentLogoPath: async () => {
      touched = true
      return `${GARAGE_ID}/logo.png`
    },
    removeLogoObject: async () => ({ error: null }),
    persistLogoPath: async () => ({ error: null }),
  })
  assert.equal(!result.success && result.code, "FORBIDDEN")
  assert.equal(touched, false)
})

// --- Garage logo: storage isolation and RLS policy guard -----------------------------------

test("replaceGarageLogoObject écrit sous {garageId}/logo.ext et retire les anciens fichiers d'extension différente", async () => {
  const { replaceGarageLogoObject } = await import("./data/logo-storage")
  const calls: { listedPrefix?: string; removed?: readonly string[]; uploadedPath?: string } = {}
  const fakeSupabase = {
    storage: {
      from: () => ({
        list: async (prefix: string) => {
          calls.listedPrefix = prefix
          return { data: [{ name: "logo.png" }, { name: "favicon.png" }], error: null }
        },
        remove: async (paths: readonly string[]) => {
          calls.removed = paths
          return { error: null }
        },
        upload: async (path: string) => {
          calls.uploadedPath = path
          return { error: null }
        },
      }),
    },
  }
  const file = logoFile("logo.webp", "image/webp", webpBytes(200, 80))
  const result = await replaceGarageLogoObject(fakeSupabase as never, GARAGE_ID, file, "webp")

  assert.equal(result.path, `${GARAGE_ID}/logo.webp`)
  assert.equal(calls.listedPrefix, GARAGE_ID)
  // only the stale "logo.*" object is removed — "favicon.png" is a different asset and must survive
  assert.deepEqual(calls.removed, [`${GARAGE_ID}/logo.png`])
  assert.equal(calls.uploadedPath, `${GARAGE_ID}/logo.webp`)
})

test("removeGarageLogoObject refuse de supprimer un chemin hors tenant", async () => {
  const { removeGarageLogoObject } = await import("./data/logo-storage")
  let removeCalled = false
  const fakeSupabase = {
    storage: {
      from: () => ({
        remove: async () => {
          removeCalled = true
          return { error: null }
        },
      }),
    },
  }
  const result = await removeGarageLogoObject(fakeSupabase as never, GARAGE_ID, `${OTHER_GARAGE_ID}/logo.png`)
  assert.equal(removeCalled, false)
  assert.equal(result.error, null)
})

test("la policy RLS du bucket garage-branding isole par garage sans contrainte de profondeur incohérente", () => {
  const sql = readFileSync("supabase/migrations/20260729000028_create_garage_branding.sql", "utf8")
  assert.match(sql, /bucket_id = 'garage-branding'/)
  assert.match(sql, /allowed_mime_types[\s\S]*image\/jpeg[\s\S]*image\/png[\s\S]*image\/webp/)
  assert.match(sql, /\(storage\.foldername\(name\)\)\[1\]/)
  assert.match(sql, /gm\.role in \('owner', 'admin'\)/)
  // {garageId}/logo.ext is exactly one folder segment: any array_length(...) depth check here
  // would need to equal 1, and copying a "= 2" or "= 3" pattern from another bucket (as happened
  // once for acquisition-documents, where the path was 2 segments but the policy required 3)
  // would silently reject every legitimate upload.
  assert.doesNotMatch(sql, /array_length\(storage\.foldername\(name\),\s*1\)\s*=\s*[023-9]/)
})

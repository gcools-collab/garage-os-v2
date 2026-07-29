import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"

import { defaultTheme } from "@/features/public/theme"
import {
  buildLiveMetadata,
  buildLiveThemeCssVariables,
  getContrastRatio,
  getLiveThemeDefinition,
  getReadableForegroundColor,
  listSelectableLiveThemes,
  LIVE_THEME_REGISTRY,
  LiveThemePreview,
  LiveThemeProvider,
  LiveThemeSelector,
  resolveLiveTheme,
} from "."
import { LIVE_THEME_KEYS } from "./types"

test("résout les thèmes default et black-yellow", () => {
  assert.equal(resolveLiveTheme({ themeKey: "default" }).key, "default")
  const blackYellow = resolveLiveTheme({ themeKey: "black-yellow" })
  assert.equal(blackYellow.key, "black-yellow")
  assert.equal(blackYellow.mode, "dark")
  assert.equal(blackYellow.tokens.primary, "#F2C811")
})

test("utilise default pour une clé inconnue ou nulle", () => {
  assert.equal(resolveLiveTheme({ themeKey: "ancienne-valeur" }).key, "default")
  assert.equal(resolveLiveTheme({ themeKey: null }).key, "default")
})

test("le registre contient toutes les clés et aucun token manquant", () => {
  assert.deepEqual(Object.keys(LIVE_THEME_REGISTRY), [...LIVE_THEME_KEYS])
  const expectedTokens = Object.keys(LIVE_THEME_REGISTRY.default.tokens).sort()
  for (const theme of Object.values(LIVE_THEME_REGISTRY)) {
    assert.deepEqual(Object.keys(theme.tokens).sort(), expectedTokens)
  }
  assert.equal(listSelectableLiveThemes().length, LIVE_THEME_KEYS.length)
})

test("reste déterministe et ne mute ni le registre ni les overrides", () => {
  const colors = { primary: "#123456", accent: "#ABCDEF" }
  const before = structuredClone(colors)
  const first = resolveLiveTheme({ themeKey: "midnight", colors })
  const second = resolveLiveTheme({ themeKey: "midnight", colors })
  assert.deepEqual(first, second)
  assert.deepEqual(colors, before)
  assert.equal(LIVE_THEME_REGISTRY.midnight.tokens.primary, "#6CB6FF")
})

test("retourne exactement la définition du registre sans override", () => {
  assert.strictEqual(resolveLiveTheme({ themeKey: "sport-red" }), getLiveThemeDefinition("sport-red"))
})

test("applique uniquement les overrides hexadécimaux autorisés", () => {
  const theme = resolveLiveTheme({
    themeKey: "default",
    colors: {
      primary: "#abcdef",
      secondary: "rgb(1, 2, 3)",
      accent: "#123456",
    },
  })
  assert.equal(theme.tokens.primary, "#ABCDEF")
  assert.equal(theme.tokens.secondary, LIVE_THEME_REGISTRY.default.tokens.secondary)
  assert.equal(theme.tokens.accent, "#123456")
  assert.equal(theme.tokens.primaryForeground, getReadableForegroundColor("#ABCDEF"))
})

test("ignore un ensemble d'overrides invalides", () => {
  assert.strictEqual(
    resolveLiveTheme({
      themeKey: "default",
      colors: { primary: "yellow", secondary: "var(--danger)", accent: "#FFF" },
    }),
    LIVE_THEME_REGISTRY.default
  )
})

test("les contrastes critiques des thèmes restent lisibles", () => {
  for (const theme of Object.values(LIVE_THEME_REGISTRY)) {
    assert.ok((getContrastRatio(theme.tokens.background, theme.tokens.foreground) ?? 0) >= 4.5)
    assert.ok((getContrastRatio(theme.tokens.surface, theme.tokens.foreground) ?? 0) >= 4.5)
    assert.ok((getContrastRatio(theme.tokens.primary, theme.tokens.primaryForeground) ?? 0) >= 4.5)
  }
})

test("mappe toutes les variables CSS sémantiques", () => {
  const variables = buildLiveThemeCssVariables(LIVE_THEME_REGISTRY["black-yellow"])
  const required = [
    "--live-background", "--live-foreground", "--live-muted-foreground",
    "--live-surface", "--live-surface-elevated", "--live-surface-muted",
    "--live-border", "--live-border-strong", "--live-primary",
    "--live-primary-foreground", "--live-primary-hover", "--live-secondary",
    "--live-secondary-foreground", "--live-accent", "--live-accent-foreground",
    "--live-success", "--live-warning", "--live-danger", "--live-focus-ring",
    "--live-overlay", "--live-shadow-color",
  ] as const
  assert.equal(required.every((variable) => variables[variable] !== undefined), true)
  assert.equal(variables["--live-primary"], "#F2C811")
})

test("le provider et l'aperçu utilisent la même définition résolue", () => {
  const theme = resolveLiveTheme({ themeKey: "black-yellow" })
  const providerHtml = renderToStaticMarkup(
    <LiveThemeProvider theme={theme}><span>Contenu</span></LiveThemeProvider>
  )
  const previewHtml = renderToStaticMarkup(<LiveThemePreview theme={theme} />)
  assert.match(providerHtml, /data-live-theme="black-yellow"/)
  assert.match(providerHtml, /--live-primary:#F2C811/)
  assert.match(previewHtml, /data-live-theme="black-yellow"/)
  assert.match(previewHtml, /--live-primary:#F2C811/)
})

test("la fixture Live actuelle passe par le registre", () => {
  const theme = resolveLiveTheme({ themeKey: defaultTheme.themeKey })
  assert.equal(theme.key, "default")
})

test("le sélecteur liste le registre et expose la sélection sans dépendre de la couleur", () => {
  const html = renderToStaticMarkup(
    <LiveThemeSelector
      themes={listSelectableLiveThemes()}
      selectedThemeKey="black-yellow"
      disabled={false}
    />
  )
  for (const theme of listSelectableLiveThemes()) {
    assert.match(html, new RegExp(`value="${theme.key}"`))
  }
  assert.match(html, /Sélectionné/)
  assert.match(html, /name="themeKey"/)
})

test("un sélecteur en lecture seule désactive les radios", () => {
  const html = renderToStaticMarkup(
    <LiveThemeSelector
      themes={listSelectableLiveThemes()}
      selectedThemeKey="default"
      disabled
    />
  )
  assert.match(html, /<fieldset disabled=""/)
})

test("prépare les metadata et le favicon depuis le branding public", () => {
  const metadata = buildLiveMetadata({
    branding: {
      displayName: "Service Auto Particuliers",
      shortDescription: "Sélection automobile.",
      faviconUrl: "https://example.fr/favicon.png",
    },
    theme: resolveLiveTheme({ themeKey: "black-yellow" }),
    page: { title: "Véhicules" },
  })
  assert.equal(metadata.title, "Véhicules | Service Auto Particuliers")
  assert.deepEqual(metadata.icons, { icon: "https://example.fr/favicon.png" })
  assert.equal(metadata.themeColor, "#090A0C")
})

test("les composants Live structurants ciblés ne codent aucune couleur de marque", () => {
  const files = [
    "src/features/public/components/layout/PublicLayout.tsx",
    "src/features/public/components/layout/Header.tsx",
    "src/features/public/components/layout/Footer.tsx",
    "src/features/public/components/ui/LiveButton.tsx",
    "src/features/public/components/ui/PriceDisplay.tsx",
    "src/features/public/components/featured/PublicVehicleCard.tsx",
  ]
  for (const file of files) {
    const source = readFileSync(file, "utf8")
    assert.doesNotMatch(source, /#[0-9a-fA-F]{3,8}|bg-black|text-yellow-|border-zinc-/)
  }
})

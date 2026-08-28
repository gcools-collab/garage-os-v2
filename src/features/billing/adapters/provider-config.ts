import type {
  ElectronicInvoiceProviderName,
  GarageElectronicInvoiceSettingsRecord,
  ProviderMode,
} from "../types/e-invoicing"

export type ServerProviderSecrets = Readonly<{
  b2brouterApiKey: string | null
  b2brouterApiVersion: string
  b2brouterApiBaseUrl: string | null
}>

export type ResolvedProviderConfiguration = Readonly<{
  providerName: ElectronicInvoiceProviderName
  mode: ProviderMode
  requestedMode: ProviderMode
  accountId: string | null
  secrets: ServerProviderSecrets
  allowProductionCalls: boolean
}>

const DEFAULT_B2B_API_VERSION = "2025-10-13"
const STAGING_BASE_URL = "https://api-staging.b2brouter.net"

export function readServerProviderSecrets(): ServerProviderSecrets {
  return {
    b2brouterApiKey: process.env.B2BROUTER_API_KEY?.trim() || null,
    b2brouterApiVersion: process.env.B2BROUTER_API_VERSION?.trim() || DEFAULT_B2B_API_VERSION,
    b2brouterApiBaseUrl: process.env.B2BROUTER_API_BASE_URL?.trim() || null,
  }
}

export function resolveProviderConfiguration(
  settings: GarageElectronicInvoiceSettingsRecord | null,
): ResolvedProviderConfiguration {
  const secrets = readServerProviderSecrets()
  const providerName = settings?.provider_name ?? "NONE"
  const requestedMode = settings?.provider_mode ?? "DISABLED"
  let mode = requestedMode

  if (providerName === "NONE") mode = "DISABLED"
  if (mode === "DISABLED") {
    return { providerName, mode, requestedMode, accountId: null, secrets, allowProductionCalls: false }
  }

  const accountId = requestedMode === "PRODUCTION"
    ? settings?.production_account_id ?? null
    : settings?.sandbox_account_id ?? null

  const hasApiKey = Boolean(secrets.b2brouterApiKey)
  if (!hasApiKey || !accountId) {
    mode = "UNCONFIGURED"
  }

  const allowProductionCalls = requestedMode === "PRODUCTION"
    && Boolean(secrets.b2brouterApiKey)
    && !secrets.b2brouterApiKey!.startsWith("test_")
    && process.env.ELECTRONIC_INVOICE_ALLOW_PRODUCTION === "true"

  return {
    providerName,
    mode,
    requestedMode,
    accountId,
    secrets,
    allowProductionCalls,
  }
}

export function validateProviderConfiguration(config: ResolvedProviderConfiguration): {
  readonly connectionStatus: "DISABLED" | "UNCONFIGURED" | "READY" | "BLOCKED"
  readonly messages: readonly string[]
} {
  const messages: string[] = []

  if (config.mode === "DISABLED" || config.providerName === "NONE") {
    return { connectionStatus: "DISABLED", messages: ["Facturation électronique désactivée."] }
  }

  if (!config.secrets.b2brouterApiKey) {
    messages.push("Clé API absente — configurez B2BROUTER_API_KEY côté serveur.")
  }
  if (!config.accountId) {
    messages.push("Identifiant de compte PA manquant dans les paramètres garage.")
  }
  if (config.mode === "PRODUCTION" && !config.allowProductionCalls) {
    messages.push("Mode production bloqué — ELECTRONIC_INVOICE_ALLOW_PRODUCTION=true et clé production requises.")
    return { connectionStatus: "BLOCKED", messages }
  }
  if (config.mode === "SANDBOX" && config.secrets.b2brouterApiKey && !config.secrets.b2brouterApiKey.startsWith("test_")) {
    messages.push("Mode sandbox : utilisez une clé API préfixée test_.")
  }

  if (messages.length > 0) {
    return { connectionStatus: "UNCONFIGURED", messages }
  }

  return { connectionStatus: "READY", messages: ["Configuration sandbox prête."] }
}

export function resolveB2brouterBaseUrl(config: ResolvedProviderConfiguration): string {
  if (config.mode === "SANDBOX") {
    return config.secrets.b2brouterApiBaseUrl || STAGING_BASE_URL
  }
  return config.secrets.b2brouterApiBaseUrl || "https://api.b2brouter.net"
}

export function productionCallsExplicitlyBlocked(config: ResolvedProviderConfiguration): boolean {
  return config.requestedMode === "PRODUCTION" && !config.allowProductionCalls
}

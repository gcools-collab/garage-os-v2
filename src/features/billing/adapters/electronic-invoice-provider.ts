import type {
  ElectronicInvoiceProviderCapabilities,
  ElectronicInvoiceReadiness,
  ElectronicInvoiceSubmissionContext,
  GarageElectronicInvoiceSettingsRecord,
  IncomingElectronicInvoiceEvent,
  ProviderStatusUpdate,
  ProviderSubmissionResult,
} from "../types/e-invoicing"
import { B2brouterElectronicInvoiceProvider } from "./b2brouter/b2brouter-provider"
import { resolveProviderConfiguration, type ResolvedProviderConfiguration } from "./provider-config"
import { validateElectronicInvoiceReadiness } from "../engines/e-invoicing-readiness-engine"

export interface ElectronicInvoiceProvider {
  readonly providerName: string
  readonly mode: ResolvedProviderConfiguration["mode"]
  readonly capabilities: ElectronicInvoiceProviderCapabilities
  validateReadiness(context: ElectronicInvoiceSubmissionContext): ElectronicInvoiceReadiness
  submitInvoice(context: ElectronicInvoiceSubmissionContext): Promise<ProviderSubmissionResult>
  getSubmissionStatus(providerReference: string): Promise<ProviderStatusUpdate>
  receiveStatusUpdate(providerReference: string): Promise<ProviderStatusUpdate>
  listIncomingEvents?(): Promise<readonly IncomingElectronicInvoiceEvent[]>
}

class DisabledElectronicInvoiceProvider implements ElectronicInvoiceProvider {
  readonly providerName = "NONE"
  readonly mode = "DISABLED" as const
  readonly capabilities = {
    supportsOutgoingInvoices: false,
    supportsIncomingInvoices: false,
    supportsEReporting: false,
    supportsCreditNotes: false,
  }

  validateReadiness(context: ElectronicInvoiceSubmissionContext): ElectronicInvoiceReadiness {
    const base = validateElectronicInvoiceReadiness({
      document: context.document,
      lines: context.lines,
      transactionNature: context.canonical.transactionNature,
    })
    return {
      ...base,
      ready: false,
      errors: [...base.errors, "Facturation électronique désactivée."],
    }
  }

  async submitInvoice(): Promise<ProviderSubmissionResult> {
    return {
      status: "NOT_SUBMITTED",
      providerReference: null,
      providerValidationErrors: [{ code: "DISABLED", message: "Facturation électronique désactivée." }],
      metadata: {},
    }
  }

  async getSubmissionStatus(_providerReference: string): Promise<ProviderStatusUpdate> {
    void _providerReference
    return {
      status: "NOT_SUBMITTED",
      providerReference: null,
      providerValidationErrors: [{ code: "DISABLED", message: "Facturation électronique désactivée." }],
      metadata: {},
    }
  }

  async receiveStatusUpdate(providerReference: string): Promise<ProviderStatusUpdate> {
    return this.getSubmissionStatus(providerReference)
  }
}

class UnconfiguredElectronicInvoiceProvider implements ElectronicInvoiceProvider {
  readonly providerName: string
  readonly mode = "UNCONFIGURED" as const
  readonly capabilities = {
    supportsOutgoingInvoices: true,
    supportsIncomingInvoices: false,
    supportsEReporting: true,
    supportsCreditNotes: false,
  }

  constructor(providerName: string) {
    this.providerName = providerName
  }

  validateReadiness(context: ElectronicInvoiceSubmissionContext): ElectronicInvoiceReadiness {
    const base = validateElectronicInvoiceReadiness({
      document: context.document,
      lines: context.lines,
      transactionNature: context.canonical.transactionNature,
    })
    return {
      ...base,
      ready: false,
      errors: [...base.errors, "Configuration PA incomplète — clé API serveur ou compte manquant."],
    }
  }

  async submitInvoice(): Promise<ProviderSubmissionResult> {
    return {
      status: "NOT_SUBMITTED",
      providerReference: null,
      providerValidationErrors: [{ code: "UNCONFIGURED", message: "Plateforme agréée non configurée." }],
      metadata: {},
    }
  }

  async getSubmissionStatus(_providerReference: string): Promise<ProviderStatusUpdate> {
    void _providerReference
    return {
      status: "NOT_SUBMITTED",
      providerReference: null,
      providerValidationErrors: [{ code: "UNCONFIGURED", message: "Plateforme agréée non configurée." }],
      metadata: {},
    }
  }

  async receiveStatusUpdate(providerReference: string): Promise<ProviderStatusUpdate> {
    return this.getSubmissionStatus(providerReference)
  }
}

export function createElectronicInvoiceProvider(
  settings: GarageElectronicInvoiceSettingsRecord | null,
  fetchImpl?: typeof fetch,
): ElectronicInvoiceProvider {
  const config = resolveProviderConfiguration(settings)

  if (config.mode === "DISABLED" || config.providerName === "NONE") {
    return new DisabledElectronicInvoiceProvider()
  }

  if (config.mode === "UNCONFIGURED") {
    return new UnconfiguredElectronicInvoiceProvider(config.providerName)
  }

  if (config.providerName === "B2BROUTER") {
    return new B2brouterElectronicInvoiceProvider(config, fetchImpl)
  }

  return new UnconfiguredElectronicInvoiceProvider(config.providerName)
}

let cachedSettings: GarageElectronicInvoiceSettingsRecord | null = null

export function setElectronicInvoiceProviderSettings(settings: GarageElectronicInvoiceSettingsRecord | null): void {
  cachedSettings = settings
}

export function getElectronicInvoiceProvider(fetchImpl?: typeof fetch): ElectronicInvoiceProvider {
  return createElectronicInvoiceProvider(cachedSettings, fetchImpl)
}

export function resetElectronicInvoiceProvider(): void {
  cachedSettings = null
}

// Backward-compatible exports for GO-0089 tests
export { DisabledElectronicInvoiceProvider as LegacyUnconfiguredElectronicInvoiceProvider }

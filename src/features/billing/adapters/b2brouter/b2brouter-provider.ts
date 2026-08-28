import type { ElectronicInvoiceSubmissionContext, ProviderStatusUpdate, ProviderSubmissionResult, ProviderValidationError } from "../../types/e-invoicing"
import type { ResolvedProviderConfiguration } from "../provider-config"
import { productionCallsExplicitlyBlocked, resolveB2brouterBaseUrl } from "../provider-config"
import { mapB2brouterStatus, mapCanonicalInvoiceToB2brouterPayload } from "./b2brouter-mapper"
import { validateElectronicInvoiceReadiness } from "../../engines/e-invoicing-readiness-engine"
import type { ElectronicInvoiceProviderCapabilities } from "../../types/e-invoicing"

export type B2brouterFetch = typeof fetch

export class B2brouterElectronicInvoiceProvider {
  readonly providerName = "B2BROUTER" as const
  readonly capabilities: ElectronicInvoiceProviderCapabilities = {
    supportsOutgoingInvoices: true,
    supportsIncomingInvoices: true,
    supportsEReporting: true,
    supportsCreditNotes: false,
  }

  constructor(
    private readonly config: ResolvedProviderConfiguration,
    private readonly fetchImpl: B2brouterFetch = fetch,
  ) {}

  get mode(): ResolvedProviderConfiguration["mode"] {
    return this.config.mode
  }

  validateReadiness(context: ElectronicInvoiceSubmissionContext) {
    const readiness = validateElectronicInvoiceReadiness({
      document: context.document,
      lines: context.lines,
      transactionNature: context.canonical.transactionNature,
    })

    if (this.config.mode === "DISABLED") {
      return {
        ...readiness,
        ready: false,
        errors: [...readiness.errors, "Plateforme agréée désactivée."],
      }
    }
    if (this.config.mode === "UNCONFIGURED") {
      return {
        ...readiness,
        ready: false,
        errors: [...readiness.errors, "Configuration PA incomplète (clé API ou compte)."],
      }
    }
    if (productionCallsExplicitlyBlocked(this.config)) {
      return {
        ...readiness,
        ready: false,
        errors: [...readiness.errors, "Mode production non autorisé sur cette instance."],
      }
    }
    if (!context.classification.paTransmissionEligible) {
      return {
        ...readiness,
        ready: false,
        errors: [...readiness.errors, "Ce flux n'est pas éligible à la transmission PA B2B."],
      }
    }

    return readiness
  }

  async submitInvoice(context: ElectronicInvoiceSubmissionContext): Promise<ProviderSubmissionResult> {
    const readiness = this.validateReadiness(context)
    if (!readiness.ready) {
      return {
        status: "ERROR",
        providerReference: null,
        providerValidationErrors: readiness.errors.map((message) => ({ code: "READINESS", message })),
        metadata: { provider: "B2BROUTER", attemptedAt: new Date().toISOString() },
      }
    }

    const apiKey = this.config.secrets.b2brouterApiKey
    const accountId = this.config.accountId
    if (!apiKey || !accountId) {
      return {
        status: "NOT_SUBMITTED",
        providerReference: null,
        providerValidationErrors: [{ code: "CONFIG", message: "Clé API ou compte B2Brouter manquant." }],
        metadata: {},
      }
    }

    if (productionCallsExplicitlyBlocked(this.config)) {
      return {
        status: "ERROR",
        providerReference: null,
        providerValidationErrors: [{ code: "PRODUCTION_BLOCKED", message: "Appels production explicitement bloqués." }],
        metadata: {},
      }
    }

    const baseUrl = resolveB2brouterBaseUrl(this.config)
    const payload = mapCanonicalInvoiceToB2brouterPayload(context.canonical, { sendAfterImport: false })
    const url = `${baseUrl}/accounts/${encodeURIComponent(accountId)}/invoices`

    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-B2B-API-Key": apiKey,
          "X-B2B-API-Version": this.config.secrets.b2brouterApiVersion,
        },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => ({})) as Record<string, unknown>
      if (!response.ok) {
        const errors = extractProviderErrors(body, response.status)
        return {
          status: "ERROR",
          providerReference: null,
          providerValidationErrors: errors,
          metadata: { provider: "B2BROUTER", httpStatus: response.status, response: sanitizeResponse(body) },
        }
      }

      const providerReference = String(body.id ?? body.invoice_id ?? "")
      return {
        status: "SUBMITTED",
        providerReference: providerReference || null,
        providerValidationErrors: [],
        metadata: {
          provider: "B2BROUTER",
          submittedAt: new Date().toISOString(),
          externalStatus: body.state ?? body.status ?? null,
          response: sanitizeResponse(body),
        },
      }
    } catch (error) {
      return {
        status: "ERROR",
        providerReference: null,
        providerValidationErrors: [{
          code: "NETWORK",
          message: error instanceof Error ? error.message : "Erreur réseau B2Brouter",
        }],
        metadata: { provider: "B2BROUTER" },
      }
    }
  }

  async getSubmissionStatus(providerReference: string): Promise<ProviderStatusUpdate> {
    const apiKey = this.config.secrets.b2brouterApiKey
    const accountId = this.config.accountId
    if (!apiKey || !accountId || !providerReference) {
      return {
        status: "NOT_SUBMITTED",
        providerReference: null,
        providerValidationErrors: [{ code: "CONFIG", message: "Impossible de consulter le statut PA." }],
        metadata: {},
      }
    }

    if (productionCallsExplicitlyBlocked(this.config)) {
      return {
        status: "ERROR",
        providerReference,
        providerValidationErrors: [{ code: "PRODUCTION_BLOCKED", message: "Consultation production bloquée." }],
        metadata: {},
      }
    }

    const baseUrl = resolveB2brouterBaseUrl(this.config)
    const url = `${baseUrl}/accounts/${encodeURIComponent(accountId)}/invoices/${encodeURIComponent(providerReference)}`

    try {
      const response = await this.fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-B2B-API-Key": apiKey,
          "X-B2B-API-Version": this.config.secrets.b2brouterApiVersion,
        },
      })
      const body = await response.json().catch(() => ({})) as Record<string, unknown>
      if (!response.ok) {
        return {
          status: "ERROR",
          providerReference,
          providerValidationErrors: extractProviderErrors(body, response.status),
          metadata: { httpStatus: response.status },
        }
      }

      const rawStatus = typeof body.state === "string" ? body.state : typeof body.status === "string" ? body.status : null
      return {
        status: mapB2brouterStatus(rawStatus),
        providerReference,
        providerValidationErrors: [],
        metadata: { externalStatus: rawStatus, response: sanitizeResponse(body) },
      }
    } catch (error) {
      return {
        status: "ERROR",
        providerReference,
        providerValidationErrors: [{
          code: "NETWORK",
          message: error instanceof Error ? error.message : "Erreur réseau B2Brouter",
        }],
        metadata: {},
      }
    }
  }

  async receiveStatusUpdate(providerReference: string): Promise<ProviderStatusUpdate> {
    return this.getSubmissionStatus(providerReference)
  }
}

function extractProviderErrors(body: Record<string, unknown>, httpStatus: number): ProviderValidationError[] {
  const errors: ProviderValidationError[] = []
  if (typeof body.error === "string") errors.push({ code: "PROVIDER", message: body.error })
  if (typeof body.message === "string") errors.push({ code: "PROVIDER", message: body.message })
  if (Array.isArray(body.errors)) {
    for (const item of body.errors) {
      if (typeof item === "string") errors.push({ code: "PROVIDER", message: item })
      if (item && typeof item === "object" && "message" in item && typeof item.message === "string") {
        errors.push({ code: "PROVIDER", message: item.message })
      }
    }
  }
  if (errors.length === 0) {
    errors.push({ code: "HTTP", message: `Réponse B2Brouter HTTP ${httpStatus}` })
  }
  return errors
}

function sanitizeResponse(body: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...body }
  delete clone.api_key
  delete clone.token
  return clone
}

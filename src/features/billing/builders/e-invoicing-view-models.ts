import { validateElectronicInvoiceReadiness } from "../engines/e-invoicing-readiness-engine"
import { classifyFromSnapshots, recipientContextLabels, regulatoryRouteLabels } from "../engines/french-regulatory-classifier"
import { validateProviderConfiguration, resolveProviderConfiguration } from "../adapters/provider-config"
import type { BillingDocumentBundle } from "../types/billing"
import type { GarageElectronicInvoiceSettingsRecord, TransactionNature } from "../types/e-invoicing"

export const electronicStatusLabels: Record<string, string> = {
  NOT_REQUIRED: "Non requise",
  NOT_SUBMITTED: "Non configurée",
  READY: "Prête",
  SUBMITTED: "Envoyée",
  ACCEPTED: "Acceptée",
  REJECTED: "Rejetée",
  ERROR: "Erreur",
}

export type ElectronicInvoiceSectionViewModel = Readonly<{
  statusLabel: string
  statusCode: string
  businessStatusLabel: string
  recipientContextLabel: string
  regulatoryRouteLabel: string
  providerName: string
  providerMode: string
  connectionStatus: string
  connectionMessages: readonly string[]
  readinessErrors: readonly string[]
  readinessWarnings: readonly string[]
  providerReference: string | null
  canSubmit: boolean
  canRefresh: boolean
  showConfigurationRequired: boolean
  paTransmissionEligible: boolean
  submissionErrors: readonly string[]
}>

export function buildElectronicInvoiceSectionViewModel(input: {
  readonly bundle: BillingDocumentBundle
  readonly settings: GarageElectronicInvoiceSettingsRecord | null
  readonly transactionNature: TransactionNature
}): ElectronicInvoiceSectionViewModel {
  const { document } = input.bundle
  const classification = classifyFromSnapshots({
    customer: document.customer_snapshot,
    issuer: document.issuer_snapshot,
    transactionNature: input.transactionNature,
  })
  const readiness = validateElectronicInvoiceReadiness({
    document,
    lines: input.bundle.lines,
    transactionNature: input.transactionNature,
  })
  const config = resolveProviderConfiguration(input.settings)
  const connection = validateProviderConfiguration(config)

  const submissionErrors = (document.electronic_submission_errors ?? []).map((item) => item.message)

  return {
    statusLabel: electronicStatusLabels[document.electronic_status] ?? document.electronic_status,
    statusCode: document.electronic_status,
    businessStatusLabel: document.status,
    recipientContextLabel: recipientContextLabels[classification.recipientContext],
    regulatoryRouteLabel: regulatoryRouteLabels[classification.regulatoryRoute],
    providerName: input.settings?.provider_name ?? "NONE",
    providerMode: config.mode,
    connectionStatus: connection.connectionStatus,
    connectionMessages: connection.messages,
    readinessErrors: readiness.errors,
    readinessWarnings: readiness.warnings,
    providerReference: document.electronic_provider_ref,
    canSubmit: readiness.ready && connection.connectionStatus === "READY" && document.electronic_status !== "ACCEPTED",
    canRefresh: Boolean(document.electronic_provider_ref) && connection.connectionStatus === "READY",
    showConfigurationRequired: connection.connectionStatus === "UNCONFIGURED" || connection.connectionStatus === "DISABLED",
    paTransmissionEligible: classification.paTransmissionEligible,
    submissionErrors,
  }
}

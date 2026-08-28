"use server"

import { revalidatePath } from "next/cache"
import { getActiveGarageSession } from "@/features/tenant"
import { createClient } from "@/lib/supabase/server"
import { buildCanonicalStructuredInvoice } from "../builders/canonical-invoice-builder"
import { classifyFromSnapshots } from "../engines/french-regulatory-classifier"
import { getElectronicInvoiceProvider, setElectronicInvoiceProviderSettings } from "../adapters/electronic-invoice-provider"
import { validateProviderConfiguration, resolveProviderConfiguration } from "../adapters/provider-config"
import { getBillingDocumentBundle, getGarageElectronicInvoiceSettings } from "../repositories/billing-repository"
import type { ElectronicInvoiceProviderName, ProviderMode, TransactionNature } from "../types/e-invoicing"
import type { BillingDocumentRecord } from "../types/billing"

export async function saveElectronicInvoiceSettings(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId || !["owner", "admin"].includes(session.memberRole ?? "")) return

  const providerName = String(formData.get("providerName") ?? "NONE") as ElectronicInvoiceProviderName
  const providerMode = String(formData.get("providerMode") ?? "DISABLED") as ProviderMode
  const sandboxAccountId = String(formData.get("sandboxAccountId") ?? "").trim() || null
  const productionAccountId = String(formData.get("productionAccountId") ?? "").trim() || null

  if (providerMode === "PRODUCTION") return

  const db = await createClient()
  await db.from("garage_electronic_invoice_settings").upsert({
    garage_id: session.garageId,
    provider_name: providerName,
    provider_mode: providerMode,
    sandbox_account_id: sandboxAccountId,
    production_account_id: productionAccountId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "garage_id" })

  revalidatePath("/settings/billing/e-invoicing")
}

export async function submitElectronicInvoice(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const invoiceId = String(formData.get("invoiceId") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return

  const bundle = await getBillingDocumentBundle(session, invoiceId)
  if (!bundle || bundle.document.document_type !== "INVOICE") return

  const settings = await getGarageElectronicInvoiceSettings(session.garageId)
  setElectronicInvoiceProviderSettings(settings)
  const provider = getElectronicInvoiceProvider()

  const transactionNature = (bundle.document as BillingDocumentRecord & { transaction_nature?: TransactionNature | null }).transaction_nature
    ?? "SERVICES"

  const canonical = buildCanonicalStructuredInvoice(bundle, transactionNature)
  const classification = classifyFromSnapshots({
    customer: bundle.document.customer_snapshot,
    issuer: bundle.document.issuer_snapshot,
    transactionNature,
  })

  const context = {
    document: bundle.document,
    lines: bundle.lines,
    canonical,
    classification,
  }

  const readiness = provider.validateReadiness(context)
  const db = await createClient()

  if (!readiness.ready) {
    await db.from("billing_documents").update({
      electronic_status: "ERROR",
      electronic_submission_errors: readiness.errors.map((message) => ({ code: "READINESS", message })),
      updated_at: new Date().toISOString(),
    }).eq("garage_id", session.garageId).eq("id", invoiceId)

    await db.from("billing_document_events").insert({
      garage_id: session.garageId,
      document_id: invoiceId,
      actor_id: session.userId,
      event_type: "ELECTRONIC_STATUS_CHANGED",
      metadata: { errors: readiness.errors },
    })

    revalidateElectronicInvoicePaths(invoiceId)
    return
  }

  const result = await provider.submitInvoice(context)
  await db.from("billing_documents").update({
    electronic_status: result.status,
    electronic_provider_ref: result.providerReference,
    electronic_provider_metadata: result.metadata,
    electronic_submission_errors: result.providerValidationErrors,
    updated_at: new Date().toISOString(),
  }).eq("garage_id", session.garageId).eq("id", invoiceId)

  await db.from("billing_document_events").insert({
    garage_id: session.garageId,
    document_id: invoiceId,
    actor_id: session.userId,
    event_type: "ELECTRONIC_STATUS_CHANGED",
    new_status: result.status,
    metadata: {
      providerReference: result.providerReference,
      errors: result.providerValidationErrors,
    },
  })

  revalidateElectronicInvoicePaths(invoiceId)
}

export async function refreshElectronicInvoiceStatus(formData: FormData): Promise<void> {
  const session = await getActiveGarageSession()
  if (!session?.garageId) return

  const invoiceId = String(formData.get("invoiceId") ?? "")
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return

  const bundle = await getBillingDocumentBundle(session, invoiceId)
  if (!bundle?.document.electronic_provider_ref) return

  const settings = await getGarageElectronicInvoiceSettings(session.garageId)
  setElectronicInvoiceProviderSettings(settings)
  const provider = getElectronicInvoiceProvider()
  const update = await provider.getSubmissionStatus(bundle.document.electronic_provider_ref)

  const db = await createClient()
  await db.from("billing_documents").update({
    electronic_status: update.status,
    electronic_provider_metadata: {
      ...(bundle.document as BillingDocumentRecord & { electronic_provider_metadata?: Record<string, unknown> }).electronic_provider_metadata,
      ...update.metadata,
      lastPolledAt: new Date().toISOString(),
    },
    electronic_submission_errors: update.providerValidationErrors,
    updated_at: new Date().toISOString(),
  }).eq("garage_id", session.garageId).eq("id", invoiceId)

  revalidateElectronicInvoicePaths(invoiceId)
}

export async function getElectronicInvoiceSettingsView(garageId: string) {
  const settings = await getGarageElectronicInvoiceSettings(garageId)
  const config = resolveProviderConfiguration(settings)
  const connection = validateProviderConfiguration(config)
  return { settings, config, connection }
}

function revalidateElectronicInvoicePaths(invoiceId: string): void {
  revalidatePath(`/billing/invoices/${invoiceId}`)
  revalidatePath("/settings/billing/e-invoicing")
  revalidatePath("/billing/invoices")
}

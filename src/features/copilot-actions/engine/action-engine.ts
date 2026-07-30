import { isVehicleStatusTransitionAllowed } from "@/features/vehicles/status/vehicle-status-transitions"
import { vehicleStatusSchema, getVehicleStatusLabel } from "@/features/vehicles/status/vehicle-status"
import { getCopilotActionRegistryEntry } from "../registry"
import type {
  CopilotActionProposalInput,
  CopilotActionSummary,
  CopilotActionTargetSnapshot,
  CopilotActionType,
} from "../types"
import {
  changePricePayloadSchema,
  changeStatusPayloadSchema,
  createTaskPayloadSchema,
  markContactedPayloadSchema,
  openEntityPayloadSchema,
} from "../validation"

const money = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
const confidenceLabels = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Haute" } as const

export function validateActionPayload(action: CopilotActionType, payload: unknown) {
  const schemas = {
    OPEN_ENTITY: openEntityPayloadSchema,
    CREATE_TASK: createTaskPayloadSchema,
    CHANGE_PRICE: changePricePayloadSchema,
    CHANGE_STATUS: changeStatusPayloadSchema,
    MARK_CONTACTED: markContactedPayloadSchema,
  } as const
  return schemas[action].safeParse(payload)
}

export function validateActionTarget(
  proposal: CopilotActionProposalInput,
  target: CopilotActionTargetSnapshot
): { readonly valid: true } | { readonly valid: false; readonly reason: string } {
  const entry = getCopilotActionRegistryEntry(proposal.action)
  if (proposal.targetId !== target.id) {
    return { valid: false, reason: "La cible de la proposition ne correspond pas." }
  }
  if (entry.targetType !== "ANY" && entry.targetType !== target.type) {
    return { valid: false, reason: "Ce type d’action ne peut pas viser cette entité." }
  }
  if (proposal.action === "CHANGE_STATUS") {
    const current = vehicleStatusSchema.safeParse(target.currentStatus)
    const payload = changeStatusPayloadSchema.safeParse(proposal.payload)
    if (!current.success || !payload.success || !isVehicleStatusTransitionAllowed(current.data, payload.data.newStatus)) {
      return { valid: false, reason: "Cette transition de statut n’est pas autorisée." }
    }
  }
  if (
    proposal.action === "MARK_CONTACTED"
    && (
      target.firstContactedAt !== null
      || ["WON", "LOST", "ARCHIVED"].includes(target.currentStatus ?? "")
    )
  ) {
    return { valid: false, reason: "Ce prospect ne peut pas être marqué comme nouvellement contacté." }
  }
  return { valid: true }
}

export function buildActionSummary(
  proposal: CopilotActionProposalInput,
  target: CopilotActionTargetSnapshot
): CopilotActionSummary {
  const base = {
    targetLabel: target.label,
    explanation: proposal.explanation,
    confidenceLabel: confidenceLabels[proposal.confidence],
  }
  if (proposal.action === "CHANGE_PRICE") {
    const payload = changePricePayloadSchema.parse(proposal.payload)
    const before = target.currentPrice ?? null
    return {
      ...base,
      title: "Modifier le prix",
      details: [
        { label: "Prix", before: before === null ? "Non renseigné" : money.format(before), after: money.format(payload.newPrice) },
        { label: "Différence", before: null, after: before === null ? "Non calculable" : money.format(payload.newPrice - before) },
        { label: "Motif", before: null, after: payload.reason },
      ],
    }
  }
  if (proposal.action === "CHANGE_STATUS") {
    const payload = changeStatusPayloadSchema.parse(proposal.payload)
    const current = vehicleStatusSchema.parse(target.currentStatus)
    return {
      ...base,
      title: "Changer le statut",
      details: [{ label: "Statut", before: getVehicleStatusLabel(current), after: getVehicleStatusLabel(payload.newStatus) }],
    }
  }
  if (proposal.action === "CREATE_TASK") {
    const payload = createTaskPayloadSchema.parse(proposal.payload)
    return {
      ...base,
      title: "Créer une tâche commerciale",
      details: [
        { label: "Tâche", before: null, after: payload.title },
        { label: "Échéance", before: null, after: new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(payload.dueAt)) },
      ],
    }
  }
  if (proposal.action === "MARK_CONTACTED") {
    return {
      ...base,
      title: "Marquer le prospect comme contacté",
      details: [{ label: "Contact", before: target.firstContactedAt ? "Déjà contacté" : "Non contacté", after: "Contacté maintenant" }],
    }
  }
  return {
    ...base,
    title: "Ouvrir la fiche",
    details: [{ label: "Destination", before: null, after: target.label }],
  }
}

export function targetIsUnchanged(
  stored: CopilotActionTargetSnapshot,
  current: CopilotActionTargetSnapshot
): boolean {
  return stored.id === current.id
    && stored.garageId === current.garageId
    && stored.version === current.version
}

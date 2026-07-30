import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { buildCopilotActionProposalViewModel } from "../builders"
import {
  buildActionSummary,
  targetIsUnchanged,
  validateActionPayload,
  validateActionTarget,
} from "../engine"
import { copilotActionRegistry, getCopilotActionRegistryEntry } from "../registry"
import { canPrepareCopilotAction, canResolveCopilotAction } from "../security"
import type {
  CopilotActionLog,
  CopilotActionProposalInput,
  CopilotActionTargetSnapshot,
} from "../types"
import { actionDecisionSchema, actionProposalSchema } from "../validation"

const target: CopilotActionTargetSnapshot = {
  id: "11111111-1111-4111-8111-111111111111",
  garageId: "22222222-2222-4222-8222-222222222222",
  type: "VEHICLE",
  label: "Audi A3",
  href: "/stock/11111111-1111-4111-8111-111111111111",
  version: "2026-07-30T10:00:00.000Z",
  currentPrice: 18_990,
  currentStatus: "PREPARATION",
}

const priceProposal: CopilotActionProposalInput = {
  action: "CHANGE_PRICE",
  targetId: target.id,
  payload: { newPrice: 18_490, reason: "Prix supérieur au marché" },
  explanation: "Le prix est supérieur à la médiane observée.",
  confidence: "HIGH",
}

const log: CopilotActionLog = {
  id: "33333333-3333-4333-8333-333333333333",
  garageId: target.garageId,
  userId: "44444444-4444-4444-8444-444444444444",
  conversationId: "55555555-5555-4555-8555-555555555555",
  action: "CHANGE_PRICE",
  targetType: "VEHICLE",
  targetId: target.id,
  payload: { newPrice: 18_490, reason: "Prix supérieur au marché" },
  targetSnapshot: target,
  explanation: priceProposal.explanation,
  confidence: "HIGH",
  status: "PROPOSED",
  createdAt: "2026-07-30T10:00:00.000Z",
  resolvedAt: null,
}

const session = {
  userId: log.userId,
  garageId: target.garageId,
  garageName: "Garage Test",
  garageSlug: "garage-test",
  memberRole: "member",
  availableGarages: [],
  requiresGarageSelection: false,
  requiresOnboarding: false,
} as const

test("le schéma accepte une proposition connue et refuse action ou cible invalides", () => {
  assert.equal(actionProposalSchema.safeParse(priceProposal).success, true)
  assert.equal(actionProposalSchema.safeParse({ ...priceProposal, action: "DELETE_VEHICLE" }).success, false)
  assert.equal(actionProposalSchema.safeParse({ ...priceProposal, targetId: "other-garage" }).success, false)
  assert.equal(actionDecisionSchema.safeParse({ proposalId: log.id }).success, true)
})

test("les payloads Zod sont stricts et bornés", () => {
  assert.equal(validateActionPayload("CHANGE_PRICE", priceProposal.payload).success, true)
  assert.equal(validateActionPayload("CHANGE_PRICE", { newPrice: -1, reason: "test" }).success, false)
  assert.equal(validateActionPayload("CREATE_TASK", {
    title: "Rappeler", type: "CALL_PROSPECT",
    dueAt: "2026-08-01T09:00:00.000Z", sql: "drop table vehicles",
  }).success, false)
})

test("le registre contient exactement les cinq actions et impose les confirmations", () => {
  assert.deepEqual(Object.keys(copilotActionRegistry), [
    "OPEN_ENTITY", "CREATE_TASK", "CHANGE_PRICE", "CHANGE_STATUS", "MARK_CONTACTED",
  ])
  assert.equal(getCopilotActionRegistryEntry("OPEN_ENTITY").requiresConfirmation, false)
  for (const action of ["CREATE_TASK", "CHANGE_PRICE", "CHANGE_STATUS", "MARK_CONTACTED"] as const) {
    assert.equal(getCopilotActionRegistryEntry(action).requiresConfirmation, true)
  }
})

test("le résumé de prix est déterministe et utilise les données serveur", () => {
  const summary = buildActionSummary(priceProposal, target)
  assert.equal(summary.title, "Modifier le prix")
  assert.match(summary.details[0]?.before ?? "", /18.?990/)
  assert.match(summary.details[0]?.after ?? "", /18.?490/)
  assert.equal(summary.confidenceLabel, "Haute")
  assert.deepEqual(summary, buildActionSummary(priceProposal, target))
})

test("une transition de statut non autorisée est refusée", () => {
  const invalid = validateActionTarget({
    action: "CHANGE_STATUS", targetId: target.id,
    payload: { newStatus: "DELIVERED" },
    explanation: "Publier", confidence: "HIGH",
  }, target)
  assert.deepEqual(invalid, { valid: false, reason: "Cette transition de statut n’est pas autorisée." })
})

test("un prospect déjà contacté ou fermé ne peut pas être marqué à nouveau", () => {
  const proposal: CopilotActionProposalInput = {
    action: "MARK_CONTACTED",
    targetId: target.id,
    payload: { note: null },
    explanation: "Premier rappel effectué",
    confidence: "HIGH",
  }
  const leadTarget = {
    ...target, type: "LEAD" as const, currentStatus: "CONTACTED",
    firstContactedAt: "2026-07-30T09:00:00.000Z",
  }
  assert.equal(validateActionTarget(proposal, leadTarget).valid, false)
})

test("une cible d’un autre garage ou un autre utilisateur est refusée", () => {
  assert.equal(canPrepareCopilotAction(session, target), true)
  assert.equal(canPrepareCopilotAction(session, { ...target, garageId: "other" }), false)
  assert.equal(canResolveCopilotAction(session, log.userId, target.garageId), true)
  assert.equal(canResolveCopilotAction(session, "other-user", target.garageId), false)
})

test("une cible modifiée après la proposition rend la confirmation obsolète", () => {
  assert.equal(targetIsUnchanged(target, target), true)
  assert.equal(targetIsUnchanged(target, { ...target, version: "2026-07-30T11:00:00.000Z" }), false)
})

test("le ViewModel prépare confirmation et annulation sans logique React", () => {
  const viewModel = buildCopilotActionProposalViewModel(log)
  assert.equal(viewModel.canConfirm, true)
  assert.equal(viewModel.canCancel, true)
  assert.equal(viewModel.navigationHref, null)
  assert.equal(buildCopilotActionProposalViewModel({ ...log, status: "CANCELLED", resolvedAt: "2026-07-30T11:00:00.000Z" }).canConfirm, false)
})

test("la migration rend l’audit immuable, privé et non supprimable", () => {
  const migration = readFileSync(resolve(
    process.cwd(), "supabase/migrations/20260730000034_create_copilot_action_workflow.sql"
  ), "utf8")
  assert.match(migration, /Copilot action audit fields are immutable/)
  assert.match(migration, /user_id = auth\.uid\(\)/)
  assert.match(migration, /foreign key \(conversation_id, garage_id, user_id\)/)
  assert.match(migration, /revoke all on table public\.copilot_action_logs from anon/)
  assert.doesNotMatch(migration, /grant delete/i)
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i)
})

test("toutes les mutations passent par le registre serveur et non React", () => {
  const component = readFileSync(resolve(
    process.cwd(), "src/features/copilot-actions/components/CopilotActionProposalCard.tsx"
  ), "utf8")
  const executor = readFileSync(resolve(
    process.cwd(), "src/features/copilot-actions/actions/action-executors.ts"
  ), "utf8")
  assert.doesNotMatch(component, /\.from\(|createClient|selling_price|first_contacted_at/)
  assert.match(executor, /executeRegisteredCopilotAction/)
  assert.match(executor, /COPILOT_APPROVAL/)
})

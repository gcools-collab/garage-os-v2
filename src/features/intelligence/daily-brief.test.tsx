import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { defaultGarageIntelligenceConfig } from "./config"
import {
  buildGarageIntelligenceBrief,
  buildRecommendationKey,
  computeAcquisitionOpportunityScore,
  computePriceRecommendation,
  deduplicateRecommendations,
  detectAcquisitionSignals,
  detectCommercialSignals,
  detectPricingSignals,
  detectPublicationSignals,
  detectStockSignals,
  groupRelatedSignals,
  rankGarageRecommendations,
} from "./engine"
import { buildGarageDailyBriefViewModel } from "./presentation"
import type {
  GarageIntelligenceSnapshot,
  IntelligenceSignal,
  IntelligenceVehicleSnapshot,
} from "./types"

const NOW = new Date("2026-07-30T10:00:00.000Z")

function vehicle(overrides: Partial<IntelligenceVehicleSnapshot> = {}): IntelligenceVehicleSnapshot {
  return {
    id: "vehicle-a",
    liveSlug: "peugeot-3008-a",
    title: "Peugeot 3008 GT",
    status: "PUBLISHED",
    publicationStatus: "PUBLISHED",
    priceCents: 2_499_000,
    purchasePriceCents: 1_800_000,
    preparationCostCents: 100_000,
    estimatedMarginCents: 599_000,
    capitalInvestedCents: 1_900_000,
    daysInStock: 20,
    daysPublished: 15,
    photoCount: 8,
    hasDescription: true,
    completenessScore: 100,
    publishedAt: "2026-07-15T10:00:00.000Z",
    lastPriceChangeAt: null,
    updatedAt: "2026-07-29T10:00:00.000Z",
    marketPosition: null,
    leadCount: 1,
    recentLeadCount: 1,
    vehicleUrl: null,
    dashboardUrl: "/stock/vehicle-a",
    ...overrides,
  }
}

function snapshot(overrides: Partial<GarageIntelligenceSnapshot> = {}): GarageIntelligenceSnapshot {
  return {
    garage: { id: "garage-a", name: "Garage Martin", timezone: "Europe/Paris" },
    generatedAt: NOW.toISOString(),
    vehicles: [vehicle()],
    leads: [{
      id: "lead-a",
      customerName: "Julie Martin",
      status: "NEW",
      type: "CALLBACK_REQUEST",
      vehicleId: "vehicle-a",
      vehicleTitle: "Peugeot 3008 GT",
      createdAt: "2026-07-29T15:00:00.000Z",
      firstContactedAt: null,
      lastContactedAt: null,
      preferredDate: null,
      nextActionAt: null,
      href: "/leads/lead-a",
    }],
    commercialTasks: [],
    acquisitionOpportunities: [],
    previousRecommendations: [],
    metrics: {
      stockValueCents: 2_499_000,
      capitalInvestedCents: 1_900_000,
      potentialMarginCents: 599_000,
    },
    ...overrides,
  }
}

function build(input = snapshot()) {
  return buildGarageIntelligenceBrief({
    snapshot: input,
    config: defaultGarageIntelligenceConfig,
    now: NOW,
    locale: "fr-FR",
    timezone: "Europe/Paris",
  })
}

test("détecte un prospect jamais contacté après le seuil", () => {
  const signals = detectCommercialSignals(snapshot(), defaultGarageIntelligenceConfig, NOW)
  assert.ok(signals.some((signal) => signal.type === "LEAD_UNCONTACTED"))
})

test("ne sur-priorise pas un prospect très récent", () => {
  const data = snapshot({
    leads: [{ ...snapshot().leads[0]!, createdAt: "2026-07-30T09:00:00.000Z" }],
  })
  assert.equal(detectCommercialSignals(data, defaultGarageIntelligenceConfig, NOW).length, 0)
})

test("détecte une tâche en retard et ignore une tâche reportée active", () => {
  const base = {
    id: "task-a", leadId: "lead-a", vehicleId: "vehicle-a",
    type: "FOLLOW_UP", status: "OPEN", title: "Relancer Julie",
    dueAt: "2026-07-30T08:00:00.000Z", snoozedUntil: null, href: "/leads/lead-a",
  }
  const overdue = snapshot({ commercialTasks: [base] })
  const snoozed = snapshot({ commercialTasks: [{
    ...base, status: "SNOOZED", snoozedUntil: "2026-07-30T15:00:00.000Z",
  }] })
  assert.ok(detectCommercialSignals(overdue, defaultGarageIntelligenceConfig, NOW)
    .some((signal) => signal.type === "COMMERCIAL_TASK_OVERDUE"))
  assert.equal(detectCommercialSignals(snoozed, defaultGarageIntelligenceConfig, NOW)
    .some((signal) => signal.type === "COMMERCIAL_TASK_OVERDUE"), false)
})

test("détecte un rendez-vous proche sans confirmation", () => {
  const data = snapshot({
    leads: [{
      ...snapshot().leads[0]!,
      type: "APPOINTMENT_REQUEST",
      preferredDate: "2026-07-30",
      firstContactedAt: "2026-07-29T15:30:00.000Z",
    }],
  })
  assert.ok(detectCommercialSignals(data, defaultGarageIntelligenceConfig, NOW)
    .some((signal) => signal.type === "APPOINTMENT_UNCONFIRMED"))
})

test("détecte véhicule vieillissant, stagnant et capital immobilisé", () => {
  const data = snapshot({ vehicles: [vehicle({
    daysInStock: 80, daysPublished: 70, recentLeadCount: 0, capitalInvestedCents: 2_500_000,
  })] })
  const types = detectStockSignals(data, defaultGarageIntelligenceConfig, NOW).map((item) => item.type)
  assert.ok(types.includes("VEHICLE_AGING"))
  assert.ok(types.includes("VEHICLE_STAGNATING"))
  assert.ok(types.includes("HIGH_CAPITAL_IMMOBILIZATION"))
})

test("détecte un véhicule au-dessus du marché avec données suffisantes", () => {
  const data = snapshot({ vehicles: [vehicle({ marketPosition: {
    comparableCount: 12, averagePriceCents: 2_250_000, medianPriceCents: 2_200_000,
    minimumPriceCents: 1_990_000, maximumPriceCents: 2_500_000,
    priceDifferenceCents: 299_000, priceDifferencePercent: 13.6,
    confidence: "MEDIUM", analyzedAt: NOW.toISOString(),
  } })] })
  assert.ok(detectPricingSignals(data, defaultGarageIntelligenceConfig, NOW)
    .some((signal) => signal.type === "VEHICLE_ABOVE_MARKET"))
})

test("refuse une recommandation tarifaire avec comparables insuffisants ou confiance faible", () => {
  const result = computePriceRecommendation({
    currentPriceCents: 2_499_000, medianPriceCents: 2_200_000,
    averagePriceCents: 2_250_000, comparableCount: 2, stockAgeDays: 60,
    capitalInvestedCents: 1_900_000, minimumMarginCents: 150_000,
    confidence: "LOW", config: defaultGarageIntelligenceConfig,
  })
  assert.equal(result.kind, "INSUFFICIENT_DATA")
  assert.equal(result.suggestedPriceCents, null)
})

test("propose un prix commercial sans franchir la marge minimale", () => {
  const result = computePriceRecommendation({
    currentPriceCents: 2_499_000, medianPriceCents: 2_200_000,
    averagePriceCents: 2_210_000, comparableCount: 12, stockAgeDays: 70,
    capitalInvestedCents: 2_100_000, minimumMarginCents: 150_000,
    confidence: "HIGH", config: defaultGarageIntelligenceConfig,
  })
  assert.equal(result.kind, "REDUCE")
  assert.ok((result.suggestedPriceCents ?? 0) >= 2_250_000)
  assert.ok((result.suggestedChangeCents ?? 0) < 0)
})

test("détecte un véhicule prêt non publié et une fiche incomplète", () => {
  const data = snapshot({ vehicles: [vehicle({
    status: "READY_TO_PUBLISH", publicationStatus: "DRAFT",
    completenessScore: 90, photoCount: 0, hasDescription: false,
  })] })
  const types = detectPublicationSignals(data, defaultGarageIntelligenceConfig, NOW).map((item) => item.type)
  assert.ok(types.includes("READY_NOT_PUBLISHED"))
  assert.ok(types.includes("MISSING_PHOTOS"))
  assert.ok(types.includes("MISSING_DESCRIPTION"))
})

test("score une opportunité d’achat fiable et refuse les données faibles", () => {
  const opportunity = {
    id: "opportunity-a", title: "Renault Clio", askingPriceCents: 1_000_000,
    marketMedianCents: 1_300_000, estimatedMarginCents: 300_000,
    comparableCount: 12, confidence: "HIGH" as const,
    listedAt: "2026-07-29T10:00:00.000Z", href: "/buying",
  }
  assert.ok(computeAcquisitionOpportunityScore(opportunity, defaultGarageIntelligenceConfig, NOW))
  assert.equal(computeAcquisitionOpportunityScore({
    ...opportunity, comparableCount: 1, confidence: "LOW",
  }, defaultGarageIntelligenceConfig, NOW), null)
  assert.equal(detectAcquisitionSignals(snapshot({
    acquisitionOpportunities: [opportunity],
  }), defaultGarageIntelligenceConfig, NOW).length, 1)
})

test("regroupe plusieurs signaux véhicule et construit une clé stable", () => {
  const signals: IntelligenceSignal[] = [
    {
      id: "a", type: "VEHICLE_AGING", category: "STOCK", severity: "HIGH",
      entityType: "vehicle", entityId: "vehicle-a", title: "Peugeot 3008",
      facts: { daysInStock: 80 }, detectedAt: NOW.toISOString(), expiresAt: null,
    },
    {
      id: "b", type: "HIGH_CAPITAL_IMMOBILIZATION", category: "PROFITABILITY",
      severity: "HIGH", entityType: "vehicle", entityId: "vehicle-a",
      title: "Peugeot 3008", facts: { capitalInvestedCents: 2_500_000 },
      detectedAt: NOW.toISOString(), expiresAt: null,
    },
  ]
  assert.equal(groupRelatedSignals(signals).length, 1)
  assert.equal(buildRecommendationKey({
    entityType: "vehicle", entityId: "vehicle-a", concern: "aging",
  }), "vehicle:vehicle-a:aging")
})

test("déduplique par clé déterministe", () => {
  const recommendation = build().recommendations[0]!
  assert.equal(deduplicateRecommendations([recommendation, recommendation]).length, 1)
})

test("classe un client chaud avant une opportunité d’achat ordinaire", () => {
  const data = snapshot({ acquisitionOpportunities: [{
    id: "opportunity-a", title: "Renault Clio", askingPriceCents: 1_000_000,
    marketMedianCents: 1_300_000, estimatedMarginCents: 300_000,
    comparableCount: 12, confidence: "MEDIUM",
    listedAt: "2026-07-29T10:00:00.000Z", href: "/buying",
  }] })
  const brief = build(data)
  assert.equal(brief.recommendations[0]?.type, "CONTACT_LEAD")
})

test("le score expose son détail et valorise le capital ancien", () => {
  const data = snapshot({ vehicles: [vehicle({
    daysInStock: 90, capitalInvestedCents: 3_000_000, recentLeadCount: 0,
  })], leads: [] })
  const recommendation = build(data).recommendations[0]
  assert.ok(recommendation)
  assert.ok(recommendation.scoreBreakdown.agingBonus > 0)
  assert.ok(recommendation.score >= 0 && recommendation.score <= 100)
})

test("respecte report et ignorance temporaire, mais réactive une déclaration terminée", () => {
  const key = "lead:lead-a:contact"
  const base = snapshot()
  const snoozed = build({
    ...base,
    previousRecommendations: [{
      id: "r1", recommendationKey: key, type: "CONTACT_LEAD", category: "COMMERCIAL",
      entityType: "lead", entityId: "lead-a", score: 90, payload: {}, status: "SNOOZED",
      snoozedUntil: "2026-07-31T10:00:00.000Z", dismissedAt: null,
      lastDetectedAt: "2026-07-29T10:00:00.000Z",
    }],
  }).recommendations[0]
  const dismissed = build({
    ...base,
    previousRecommendations: [{
      id: "r1", recommendationKey: key, type: "CONTACT_LEAD", category: "COMMERCIAL",
      entityType: "lead", entityId: "lead-a", score: 90, payload: {}, status: "DISMISSED",
      snoozedUntil: null, dismissedAt: "2026-07-29T10:00:00.000Z",
      lastDetectedAt: "2026-07-29T10:00:00.000Z",
    }],
  }).recommendations[0]
  const completed = build({
    ...base,
    previousRecommendations: [{
      id: "r1", recommendationKey: key, type: "CONTACT_LEAD", category: "COMMERCIAL",
      entityType: "lead", entityId: "lead-a", score: 90, payload: {}, status: "COMPLETED",
      snoozedUntil: null, dismissedAt: null,
      lastDetectedAt: "2026-07-29T10:00:00.000Z",
    }],
  }).recommendations[0]
  assert.equal(snoozed?.status, "SNOOZED")
  assert.equal(dismissed?.status, "DISMISSED")
  assert.equal(completed?.status, "ACTIVE")
})

test("résout une recommandation lorsque la condition réelle disparaît", () => {
  const data = snapshot({
    leads: [{ ...snapshot().leads[0]!, firstContactedAt: "2026-07-30T09:00:00.000Z" }],
    previousRecommendations: [{
      id: "r1", recommendationKey: "lead:lead-a:contact", type: "CONTACT_LEAD",
      category: "COMMERCIAL", entityType: "lead", entityId: "lead-a",
      score: 90, payload: {}, status: "ACTIVE",
      snoozedUntil: null, dismissedAt: null, lastDetectedAt: NOW.toISOString(),
    }],
  })
  assert.deepEqual(build(data).resolvedRecommendationKeys, ["lead:lead-a:contact"])
})

test("reste déterministe, immutable et utilise now injecté", () => {
  const data = snapshot()
  const before = structuredClone(data)
  assert.deepEqual(build(data), build(data))
  assert.deepEqual(data, before)
})

test("prépare les libellés français, efforts, confiance, preuves et CTA", () => {
  const view = buildGarageDailyBriefViewModel(build())
  const top = view.topRecommendations[0]
  assert.equal(view.greeting, "Bonjour, Garage Martin.")
  assert.match(top?.effortLabel ?? "", /3 min/)
  assert.match(top?.confidenceLabel ?? "", /élevée/)
  assert.equal(top?.ctaLabel, "Ouvrir le prospect")
  assert.ok(top?.evidence.length)
})

test("formate un prix suggéré depuis une valeur numérique structurée", () => {
  const data = snapshot({ vehicles: [vehicle({
    daysInStock: 70,
    marketPosition: {
      comparableCount: 12, averagePriceCents: 2_210_000, medianPriceCents: 2_200_000,
      minimumPriceCents: 2_000_000, maximumPriceCents: 2_500_000,
      priceDifferenceCents: 299_000, priceDifferencePercent: 13.6,
      confidence: "HIGH", analyzedAt: NOW.toISOString(),
    },
  })], leads: [] })
  const view = buildGarageDailyBriefViewModel(build(data))
  assert.ok(view.recommendations.some((item) =>
    item.evidence.some((proof) => proof.startsWith("Prix suggéré :"))
  ))
})

test("n’invente aucun montant quand aucune donnée financière ne le justifie", () => {
  const view = buildGarageDailyBriefViewModel(build(snapshot({
    vehicles: [], leads: [], commercialTasks: [],
    metrics: { stockValueCents: 0, capitalInvestedCents: 0, potentialMarginCents: 0 },
  })))
  assert.equal(view.metrics.concernedCapitalLabel, null)
  assert.equal(view.metrics.potentialMarginLabel, null)
  assert.ok(view.emptyState)
})

test("la page /intelligence garde un seul h1 et aucune table horizontale", () => {
  const page = readFileSync("src/features/intelligence/components/GarageIntelligenceBriefPage.tsx", "utf8")
  assert.equal((page.match(/<h1/g) ?? []).length, 1)
  assert.match(page, /Votre brief Garage OS/)
  assert.doesNotMatch(page, /<table/)
})

test("le ranking reste déterministe à score égal", () => {
  const recommendation = build().recommendations[0]!
  const drafts = [recommendation, {
    ...recommendation, recommendationKey: "lead:another:contact", entityId: "another",
  }]
  const ranked = rankGarageRecommendations(drafts)
  assert.deepEqual(ranked.map((item) => item.recommendationKey), [...ranked]
    .sort((a, b) => b.score - a.score || a.recommendationKey.localeCompare(b.recommendationKey))
    .map((item) => item.recommendationKey))
})

test("la migration impose clé tenant, payload borné, RLS et aucun accès anon", () => {
  const sql = readFileSync("supabase/migrations/20260730000032_create_garage_intelligence_brief.sql", "utf8")
  assert.match(sql, /unique \(garage_id, recommendation_key\)/i)
  assert.match(sql, /pg_column_size\(payload\) <= 32768/i)
  assert.match(sql, /enable row level security/i)
  assert.match(sql, /Recommendation garage cannot be changed/i)
  assert.match(sql, /revoke all on table public\.intelligence_recommendations from anon/i)
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)/i)
})

test("le repository reste groupé, explicite et tenant-scoped", () => {
  const source = readFileSync("src/features/intelligence/data/garage-intelligence-repository.ts", "utf8")
  assert.doesNotMatch(source, /select\("\*"\)/)
  assert.match(source, /\.eq\("garage_id", session\.garageId\)/)
  assert.match(source, /Promise\.all/)
})

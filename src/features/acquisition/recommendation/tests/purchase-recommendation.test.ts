import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import type { AcquisitionOpportunity } from "../../types/opportunity"
import {
  buildPurchaseRecommendationContext,
  buildPurchaseRecommendationViewModel,
} from "../builders"
import {
  buildPurchaseRecommendation,
  buildRecommendationFactors,
  calculateConfidenceScore,
  calculateFinancialScore,
  calculateMarketScore,
  calculateOpportunityScore,
  calculateRotationScore,
} from "../engine"

function opportunity(
  overrides: Partial<AcquisitionOpportunity> = {}
): AcquisitionOpportunity {
  return {
    id: "9e83ad13-9df8-4f03-8960-c89e322932a8",
    garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
    creatorUserId: "067fce5a-735a-4394-bbe6-728a5058603d",
    seller: {
      id: "11121f3c-68aa-4c4b-bdd5-eb01c709db12",
      garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
      type: "PRIVATE", name: "Julien Martin", phone: null,
      email: null, city: "Raismes", internalComments: null,
    },
    status: "IN_REVIEW", provenance: "CUSTOMER_TRADE_IN",
    confidenceLevel: "MEDIUM", registration: "AB-123-CD",
    vin: "WBA8M9C50J5K12345", brand: "BMW", model: "M3", trim: "Competition",
    year: 2017, fuel: "Essence", gearbox: "Automatique", mileage: 63_000,
    color: "Bleu", options: ["Toit carbone"], generalCondition: "GOOD",
    askingPrice: 42_000, repairEstimate: 2_000, comments: null, sourceUrl: null,
    documents: [
      {
        id: "2e79d443-7be3-4771-8d65-a5a155694917",
        category: "TECHNICAL_INSPECTION", label: "CT",
        originalFilename: "ct.pdf", storagePath: "garage/opportunity/ct.pdf",
        createdAt: "2026-07-30T10:00:00.000Z",
      },
      {
        id: "be7eb30f-790a-4e3f-8b64-0dc30170a109",
        category: "PHOTO", label: "Avant",
        originalFilename: "avant.jpg", storagePath: "garage/opportunity/avant.jpg",
        createdAt: "2026-07-30T10:00:00.000Z",
      },
    ],
    createdAt: "2026-07-30T10:00:00.000Z",
    updatedAt: "2026-07-30T10:00:00.000Z",
    ...overrides,
  }
}

const NOW = new Date("2026-07-30T12:00:00.000Z")

test("calcule chaque moteur de score indépendamment", () => {
  const source = opportunity()
  const factors = buildRecommendationFactors(source, NOW)
  const market = calculateMarketScore(factors)
  const financial = calculateFinancialScore(44_500, 6_500)
  const rotation = calculateRotationScore(source, factors)
  const confidence = calculateConfidenceScore(factors)
  const global = calculateOpportunityScore({ market, financial, rotation, confidence })
  for (const score of [market, financial, rotation, confidence, global]) {
    assert.equal(score.value >= 0 && score.value <= 100, true)
    assert.ok(score.explanation.length > 10)
  }
  assert.match(global.explanation, /30 % marché/)
})

test("produit des facteurs pondérés et tous expliqués", () => {
  const factors = buildRecommendationFactors(opportunity(), NOW)
  assert.equal(factors.length, 10)
  assert.equal(factors.reduce((sum, factor) => sum + factor.weight, 0), 100)
  assert.equal(factors.every((factor) => factor.explanation.length > 0), true)
  assert.equal(new Set(factors.map((factor) => factor.code)).size, factors.length)
})

test("calcule des prix et marges cohérents sans décider à la place du garage", () => {
  const recommendation = buildPurchaseRecommendation({ opportunity: opportunity(), now: NOW })
  assert.ok(recommendation.recommendedPurchasePrice !== null)
  assert.ok(recommendation.maximumPurchasePrice !== null)
  assert.ok(recommendation.resaleEstimateMedian !== null)
  assert.ok(recommendation.recommendedPurchasePrice <= recommendation.maximumPurchasePrice)
  assert.ok(recommendation.maximumPurchasePrice <= 42_000)
  assert.equal(
    recommendation.estimatedNetMargin,
    recommendation.estimatedGrossMargin === null
      ? null : recommendation.estimatedGrossMargin - recommendation.estimatedCosts
  )
  assert.match(recommendation.calculationBasis, /ne constitue pas encore une analyse du marché/)
})

test("reste déterministe et immutable", () => {
  const source = opportunity()
  const before = structuredClone(source)
  const first = buildPurchaseRecommendation({ opportunity: source, now: NOW })
  const second = buildPurchaseRecommendation({ opportunity: source, now: NOW })
  assert.deepEqual(first, second)
  assert.deepEqual(source, before)
  assert.equal(first.generatedAt, NOW.toISOString())
})

test("ne fabrique aucun prix lorsque les données sont incomplètes", () => {
  const recommendation = buildPurchaseRecommendation({
    opportunity: opportunity({
      askingPrice: null, repairEstimate: null, year: null, mileage: null,
      generalCondition: "UNKNOWN", registration: null, vin: null, documents: [],
    }),
    now: NOW,
  })
  assert.equal(recommendation.resaleEstimateMedian, null)
  assert.equal(recommendation.recommendedPurchasePrice, null)
  assert.equal(recommendation.maximumPurchasePrice, null)
  assert.equal(recommendation.estimatedCosts, 0)
  assert.equal(recommendation.recommendations[0], "Renseigner le prix demandé avant toute négociation.")
  assert.equal(recommendation.confidence, "LOW")
})

test("considère un prix demandé nul comme indisponible", () => {
  const recommendation = buildPurchaseRecommendation({
    opportunity: opportunity({ askingPrice: 0 }),
    now: NOW,
  })
  assert.equal(recommendation.recommendedPurchasePrice, null)
  assert.equal(recommendation.resaleEstimateMedian, null)
})

test("borne les valeurs extrêmes et conserve un prix recommandé positif", () => {
  const recommendation = buildPurchaseRecommendation({
    opportunity: opportunity({
      askingPrice: 1_000_000, repairEstimate: 900_000,
      mileage: 900_000, generalCondition: "POOR", year: 1900,
    }),
    now: NOW,
  })
  assert.equal(recommendation.recommendedPurchasePrice, 0)
  assert.equal(recommendation.maximumPurchasePrice, 0)
  assert.equal(recommendation.opportunityScore >= 0, true)
})

test("le builder prépare toutes les chaînes de présentation", () => {
  const recommendation = buildPurchaseRecommendation({ opportunity: opportunity(), now: NOW })
  const viewModel = buildPurchaseRecommendationViewModel(recommendation)
  assert.match(viewModel.recommendedPrice, /€/)
  assert.match(viewModel.scoreLabel, /\/ 100/)
  assert.equal(viewModel.factors.length, recommendation.factors.length)
  assert.equal("opportunityId" in viewModel, false)
})

test("prépare un contrat structuré directement consommable par le Copilote", () => {
  const recommendation = buildPurchaseRecommendation({ opportunity: opportunity(), now: NOW })
  const context = buildPurchaseRecommendationContext(recommendation)
  assert.equal(context.maximumPurchasePrice, recommendation.maximumPurchasePrice)
  assert.equal(context.opportunityScore, recommendation.opportunityScore)
  assert.equal(context.explanations.length, recommendation.factors.length)
})

test("le repository réutilise la lecture tenant-scopée de l’opportunité", () => {
  const source = readFileSync(resolve(
    "src/features/acquisition/recommendation/repositories/purchase-recommendation-repository.ts"
  ), "utf8")
  assert.match(source, /import "server-only"/)
  assert.match(source, /getAcquisitionOpportunity\(session, opportunityId\)/)
  assert.match(source, /buildPurchaseRecommendation/)
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"
import type { AcquisitionOpportunity } from "../../../types/opportunity"
import { buildPurchaseRecommendation } from "../../../recommendation/engine"
import { analyzeAcquisitionMarket } from "../../engine"
import type { AcquisitionMarketAnalysis, ComparableVehicle } from "../../types"
import { buildAcquisitionMarketAiContext } from "../builders"
import {
  ACQUISITION_MARKET_AI_PROMPT_VERSION,
  ACQUISITION_MARKET_AI_SYSTEM_PROMPT,
} from "../prompts"
import { generateAcquisitionMarketAiInsight } from "../engine"
import type { AcquisitionMarketAiProvider } from "../types"
import { acquisitionMarketAiInsightSchema } from "../validation"

const NOW = new Date("2026-07-30T12:00:00.000Z")
const validInsight = {
  summary: "Marché actif, sous réserve de vérifier l’entretien.",
  positiveSignals: [{
    code: "RECENT_MAINTENANCE", label: "Entretien récent",
    explanation: "La description mentionne une révision.",
    sourceType: "LISTING_DESCRIPTION", sourceReference: "leboncoin:1",
    confidence: "MEDIUM",
  }],
  riskSignals: [{
    code: "GEARBOX_CHECK", label: "Boîte à vérifier",
    explanation: "Une formulation reste ambiguë.",
    sourceType: "LISTING_DESCRIPTION", sourceReference: "leboncoin:1",
    confidence: "LOW",
  }],
  extractedFacts: [{
    code: "SERVICE_BOOK", value: "Carnet mentionné",
    sourceType: "LISTING_DESCRIPTION", sourceReference: "leboncoin:1",
    evidence: "Carnet disponible", confidence: "HIGH", status: "CONFIRMED",
  }],
  recommendedChecks: ["Contrôler la boîte lors de l’essai."],
  negotiationArguments: ["Faire confirmer l’historique d’entretien."],
  limitations: ["Prix observés et non prix de transaction."],
  confidence: "MEDIUM",
} as const

function opportunity(): AcquisitionOpportunity {
  return {
    id: "9e83ad13-9df8-4f03-8960-c89e322932a8",
    garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
    creatorUserId: "067fce5a-735a-4394-bbe6-728a5058603d",
    seller: {
      id: "11121f3c-68aa-4c4b-bdd5-eb01c709db12",
      garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
      type: "PRIVATE", name: "Identité privée", phone: "0600000000",
      email: "secret@example.test", city: "Raismes",
      internalComments: "Note commerciale confidentielle",
    },
    status: "IN_REVIEW", provenance: "CUSTOMER_TRADE_IN",
    confidenceLevel: "MEDIUM", registration: "AB-123-CD", vin: null,
    brand: "BMW", model: "M3", trim: "Competition", year: 2017,
    fuel: "Essence", gearbox: "Automatique", mileage: 63_000,
    color: "Bleu", options: [], generalCondition: "GOOD",
    askingPrice: 38_000, repairEstimate: 2_000,
    comments: "Ne pas communiquer cette note interne.", sourceUrl: null,
    documents: [], createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  }
}

function comparable(): ComparableVehicle {
  return {
    source: "leboncoin", externalId: "1", brand: "BMW", model: "M3",
    trim: "Competition", year: 2017, mileage: 60_000, fuel: "Essence",
    gearbox: "Automatique", powerDin: 450, advertisedPrice: 49_000,
    priceNature: "ASKING_PRICE", location: "Lille", sellerType: "PROFESSIONAL",
    publishedAt: "2026-07-20T00:00:00Z", collectedAt: NOW.toISOString(),
    url: "https://example.test/1", dataQuality: 100,
    description: "Carnet disponible. Révision récente.",
    imageUrls: ["https://img.example.test/1.jpg"],
    similarityScore: 90, matchedCriteria: ["Marque et modèle identiques"],
    importantDifferences: [], selectionReason: "Comparable retenu.",
  }
}

function market(): AcquisitionMarketAnalysis {
  return analyzeAcquisitionMarket({
    comparables: [comparable()], askingPrice: 38_000, now: NOW,
  })
}

class FakeProvider implements AcquisitionMarketAiProvider {
  readonly id = "fake"
  readonly supportsVision = false
  constructor(private readonly output: unknown, private readonly failure?: Error) {}
  async generate(): Promise<unknown> {
    if (this.failure) throw this.failure
    return this.output
  }
}

test("valide strictement une sortie IA structurée", () => {
  assert.equal(acquisitionMarketAiInsightSchema.safeParse(validInsight).success, true)
  assert.equal(acquisitionMarketAiInsightSchema.safeParse({
    ...validInsight, confidence: "CERTAIN", unexpected: true,
  }).success, false)
})

test("utilise un fake provider sans appel payant et conserve la provenance", async () => {
  const result = await generateAcquisitionMarketAiInsight({
    opportunity: opportunity(), market: market(),
    provider: new FakeProvider(validInsight),
  })
  assert.equal(result.available, true)
  if (!result.available) return
  assert.equal(result.insight.extractedFacts[0].sourceType, "LISTING_DESCRIPTION")
  assert.equal(result.insight.extractedFacts[0].sourceReference, "leboncoin:1")
  assert.equal(result.insight.extractedFacts[0].evidence, "Carnet disponible")
})

test("rejette proprement une sortie invalide", async () => {
  const result = await generateAcquisitionMarketAiInsight({
    opportunity: opportunity(), market: market(),
    provider: new FakeProvider({ summary: "texte incomplet" }),
  })
  assert.deepEqual(result, {
    available: false, insight: null, message: "Réponse IA invalide et ignorée.",
  })
})

test("dégrade proprement absence de provider et timeout", async () => {
  const absent = await generateAcquisitionMarketAiInsight({
    opportunity: opportunity(), market: market(), provider: null,
  })
  const timeout = await generateAcquisitionMarketAiInsight({
    opportunity: opportunity(), market: market(),
    provider: new FakeProvider(null, new Error("TimeoutError")),
  })
  assert.equal(absent.available, false)
  assert.equal(timeout.available, false)
})

test("le contexte minimise les données et borne les contenus publics", () => {
  const context = buildAcquisitionMarketAiContext(opportunity(), market(), false)
  const serialized = JSON.stringify(context)
  assert.doesNotMatch(serialized, /Identité privée|0600000000|secret@example|confidentielle/)
  assert.equal(context.publicListings[0].description, "Carnet disponible. Révision récente.")
  assert.deepEqual(context.publicListings[0].imageUrls, [])
})

test("la vision est explicitement dépendante de la capacité provider", () => {
  const withoutVision = buildAcquisitionMarketAiContext(opportunity(), market(), false)
  const withVision = buildAcquisitionMarketAiContext(opportunity(), market(), true)
  assert.equal(withoutVision.publicListings[0].imageUrls.length, 0)
  assert.equal(withVision.publicListings[0].imageUrls.length, 1)
})

test("l’IA ne peut modifier aucun prix ou score déterministe", async () => {
  const source = opportunity()
  const analysis = market()
  const before = buildPurchaseRecommendation({
    opportunity: source, marketAnalysis: analysis, now: NOW,
  })
  await generateAcquisitionMarketAiInsight({
    opportunity: source, market: analysis, provider: new FakeProvider(validInsight),
  })
  const after = buildPurchaseRecommendation({
    opportunity: source, marketAnalysis: analysis, now: NOW,
  })
  assert.deepEqual(after, before)
})

test("le prompt est versionné et interdit les calculs financiers IA", () => {
  assert.equal(ACQUISITION_MARKET_AI_PROMPT_VERSION, "acquisition-market-v1")
  assert.match(ACQUISITION_MARKET_AI_SYSTEM_PROMPT, /Ne calcule et ne modifie jamais un prix/)
  assert.match(ACQUISITION_MARKET_AI_SYSTEM_PROMPT, /N'invente aucune/)
})

test("la configuration exige un opt-in et ne place aucun secret côté client", () => {
  const source = readFileSync(resolve(
    "src/features/acquisition/market/ai/repositories/ai-provider-factory.ts"
  ), "utf8")
  assert.match(source, /AI_INSIGHTS_ENABLED !== "true"/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_/)
})

test("la fiche sépare explicitement calculs déterministes et insights IA", () => {
  const page = readFileSync(resolve(
    "src/app/(dashboard)/acquisition/[id]/page.tsx"
  ), "utf8")
  assert.match(page, /Analyse chiffrée/)
  assert.match(page, /AcquisitionMarketCard/)
  assert.match(page, /PurchaseRecommendationCard/)
  assert.match(page, /AcquisitionMarketAiCard/)
})

import assert from "node:assert/strict"
import test from "node:test"
import type { MarketListing, MarketProvider as LegacyProvider } from "@/features/market"
import type { AcquisitionOpportunity } from "../../types/opportunity"
import { buildPurchaseRecommendation } from "../../recommendation/engine"
import { buildAcquisitionMarketViewModel, buildMarketAnalysisContext } from "../builders"
import {
  analyzeAcquisitionMarket,
  buildAcquisitionMarketQuery,
  collectAcquisitionMarketAnalysis,
} from "../engine"
import { normalizeMarketplaceListing } from "../normalizers"
import { MarketplaceProvider } from "../providers"
import type { ComparableVehicle, MarketProvider } from "../types"

const NOW = new Date("2026-07-30T12:00:00.000Z")
const listing = (overrides: Partial<MarketListing> = {}): MarketListing => ({
  providerId: "leboncoin", externalId: "listing-1", url: "https://example.test/1",
  title: "BMW M3 Competition", brand: "BMW", model: "M3", trim: "Competition",
  year: 2017, mileage: 63_000, fuel: "Essence", gearbox: "Automatique",
  powerDin: 450, price: 45_000, currency: "EUR", location: "Lille",
  sellerType: "PROFESSIONAL", publishedAt: "2026-07-15T00:00:00.000Z",
  imageUrls: [], favoriteCount: null, ...overrides,
})
const comparable = (
  id: string,
  price: number,
  overrides: Partial<ComparableVehicle> = {}
): ComparableVehicle => ({
  source: "leboncoin", externalId: id, brand: "BMW", model: "M3",
  trim: "Competition", year: 2017, mileage: 63_000, fuel: "Essence",
  gearbox: "Automatique", powerDin: 450, advertisedPrice: price,
  priceNature: "ASKING_PRICE",
  location: "Lille", sellerType: "PROFESSIONAL",
  publishedAt: "2026-07-15T00:00:00.000Z",
  collectedAt: NOW.toISOString(), url: `https://example.test/${id}`,
  dataQuality: 100,
  description: "Entretien suivi et factures disponibles.",
  imageUrls: [],
  similarityScore: 90,
  matchedCriteria: ["Marque et modèle identiques"],
  importantDifferences: [],
  selectionReason: "Comparable retenu avec un score de similarité de 90/100.",
  ...overrides,
})
const opportunity = (): AcquisitionOpportunity => ({
  id: "9e83ad13-9df8-4f03-8960-c89e322932a8",
  garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
  creatorUserId: "067fce5a-735a-4394-bbe6-728a5058603d",
  seller: {
    id: "11121f3c-68aa-4c4b-bdd5-eb01c709db12",
    garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
    type: "PRIVATE", name: "Julien", phone: null, email: null,
    city: "Raismes", internalComments: null,
  },
  status: "IN_REVIEW", provenance: "CUSTOMER_TRADE_IN",
  confidenceLevel: "MEDIUM", registration: null, vin: null, brand: "BMW",
  model: "M3", trim: "Competition", year: 2017, fuel: "Essence",
  gearbox: "Automatique", mileage: 63_000, color: "Bleu", options: [],
  generalCondition: "GOOD", askingPrice: 38_000, repairEstimate: 2_000,
  comments: null, sourceUrl: "https://example.test/source", documents: [],
  createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
})

test("normalise un listing provider vers le modèle comparable", () => {
  const normalized = normalizeMarketplaceListing(listing(), NOW)
  assert.equal(normalized?.advertisedPrice, 45_000)
  assert.equal(normalized?.source, "leboncoin")
  assert.equal(normalized?.dataQuality, 100)
  assert.equal(normalizeMarketplaceListing(listing({ price: -1 }), NOW), null)
})

test("le MarketplaceProvider filtre, matche et normalise sans exposer le format source", async () => {
  const legacy: LegacyProvider = {
    id: "leboncoin",
    async search() {
      return [listing(), listing({ externalId: "other", model: "M4", title: "BMW M4" })]
    },
  }
  const result = await new MarketplaceProvider(legacy).search(
    buildAcquisitionMarketQuery(opportunity()), NOW
  )
  assert.equal(result.length, 1)
  assert.equal(result[0].model, "M3")
})

test("calcule médiane, moyenne, dispersion, kilométrage, géographie et fraîcheur", () => {
  const analysis = analyzeAcquisitionMarket({
    comparables: [
      comparable("1", 40_000),
      comparable("2", 45_000, { location: "Paris", mileage: 70_000 }),
      comparable("3", 50_000),
    ],
    askingPrice: 38_000, now: NOW,
  })
  assert.equal(analysis.comparableCount, 3)
  assert.equal(analysis.minimumPrice, 40_000)
  assert.equal(analysis.medianPrice, 45_000)
  assert.equal(analysis.maximumPrice, 50_000)
  assert.equal(analysis.averagePrice, 45_000)
  assert.ok((analysis.priceDispersion ?? 0) > 0)
  assert.equal(analysis.freshnessDays, 0)
  assert.equal(analysis.geographicDistribution[0].location, "Lille")
})

test("détecte et exclut les valeurs aberrantes des statistiques", () => {
  const analysis = analyzeAcquisitionMarket({
    comparables: [
      comparable("1", 39_000), comparable("2", 40_000),
      comparable("3", 41_000), comparable("4", 250_000),
    ],
    askingPrice: 38_000, now: NOW,
  })
  assert.equal(analysis.outlierCount, 1)
  assert.equal(analysis.maximumPrice, 41_000)
  assert.equal(analysis.signals.some((signal) => signal.code === "OUTLIERS_DETECTED"), true)
})

test("produit des signaux déterministes d’offre, rotation, prix et demande", () => {
  const fast = analyzeAcquisitionMarket({
    comparables: [
      comparable("1", 40_000), comparable("2", 42_000), comparable("3", 44_000),
    ],
    askingPrice: 35_000, now: NOW,
  })
  assert.equal(fast.signals.some((signal) => signal.code === "LOW_SUPPLY"), true)
  assert.equal(fast.signals.some((signal) => signal.code === "FAST_ROTATION"), true)
  assert.equal(fast.signals.some((signal) => signal.code === "HIGH_DEMAND"), true)
  assert.equal(fast.signals.some((signal) => signal.code === "UNDER_PRICED"), true)
})

test("reste exploitable avec des données incomplètes", () => {
  const analysis = analyzeAcquisitionMarket({
    comparables: [comparable("1", 40_000, {
      mileage: null, location: null, publishedAt: null, dataQuality: 40,
    })],
    askingPrice: null, now: NOW,
  })
  assert.equal(analysis.confidence, "LOW")
  assert.equal(analysis.averageMileage, null)
  assert.equal(analysis.averageListingAgeDays, null)
  assert.equal(analysis.signals[0].code, "LIMITED_DATA")
})

test("un provider indisponible retourne une analyse vide sans exception", async () => {
  const provider: MarketProvider = {
    id: "broken",
    async search() { throw new Error("timeout") },
  }
  const analysis = await collectAcquisitionMarketAnalysis(opportunity(), provider, NOW)
  assert.equal(analysis.providerAvailable, false)
  assert.equal(analysis.comparableCount, 0)
  assert.match(analysis.providerMessage ?? "", /indisponible/)
})

test("la recommandation privilégie une analyse marché fiable", () => {
  const marketAnalysis = analyzeAcquisitionMarket({
    comparables: Array.from({ length: 8 }, (_, index) =>
      comparable(String(index), 49_000 + index * 500)
    ),
    askingPrice: 38_000, now: NOW,
  })
  const recommendation = buildPurchaseRecommendation({
    opportunity: opportunity(), now: NOW, marketAnalysis,
    historicalGarageEstimate: 47_000,
  })
  assert.equal(recommendation.resaleSource, "MARKET_ANALYSIS")
  assert.equal(recommendation.resaleEstimateMedian, marketAnalysis.medianPrice)
  assert.equal(recommendation.scores.market.value, marketAnalysis.marketScore)
})

test("une analyse fiable permet une recommandation même sans prix demandé", () => {
  const source = { ...opportunity(), askingPrice: null }
  const marketAnalysis = analyzeAcquisitionMarket({
    comparables: Array.from({ length: 8 }, (_, index) =>
      comparable(String(index), 49_000 + index * 500)
    ),
    askingPrice: null, now: NOW,
  })
  const recommendation = buildPurchaseRecommendation({
    opportunity: source, now: NOW, marketAnalysis,
  })
  assert.equal(recommendation.resaleSource, "MARKET_ANALYSIS")
  assert.ok(recommendation.recommendedPurchasePrice !== null)
})

test("la recommandation respecte marché puis historique puis estimation provisoire", () => {
  const source = opportunity()
  const history = buildPurchaseRecommendation({
    opportunity: source, now: NOW, historicalGarageEstimate: 46_000,
  })
  const provisional = buildPurchaseRecommendation({ opportunity: source, now: NOW })
  assert.equal(history.resaleSource, "GARAGE_HISTORY")
  assert.equal(history.resaleEstimateMedian, 46_000)
  assert.equal(provisional.resaleSource, "PROVISIONAL")
})

test("les builders préparent l’UI et le contrat Copilote sans calcul React", () => {
  const analysis = analyzeAcquisitionMarket({
    comparables: [comparable("1", 40_000), comparable("2", 42_000), comparable("3", 44_000)],
    askingPrice: 38_000, now: NOW,
  })
  const viewModel = buildAcquisitionMarketViewModel(analysis)
  const context = buildMarketAnalysisContext(analysis)
  assert.match(viewModel.metrics[2].value, /€/)
  assert.equal(viewModel.comparables.length, 3)
  assert.equal(context.medianPrice, 42_000)
  assert.equal(context.comparableEvidence.length, 3)
})

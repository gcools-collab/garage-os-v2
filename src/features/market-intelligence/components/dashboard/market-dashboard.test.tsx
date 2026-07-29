import assert from "node:assert/strict"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { vehicles } from "@/features/public/data"
import { marketListingsFixture } from "../../models/market-listings.fixture"
import { buildMarketDashboard } from "../../presentation"
import { MarketDashboardPage } from "./MarketDashboardPage"

test("rend le dashboard complet avec un seul h1", () => {
  const markup = renderToStaticMarkup(<MarketDashboardPage dashboard={buildMarketDashboard({ vehicles, listings: marketListingsFixture })} />)
  assert.equal((markup.match(/<h1/g) ?? []).length, 1)
  assert.match(markup, /Actions prioritaires/)
  assert.match(markup, /Analyse des véhicules/)
  assert.match(markup, /Véhicules analysés/)
  assert.match(markup, /Voir l’analyse détaillée/)
  assert.match(markup, /Comparables retenus/)
  assert.doesNotMatch(markup, />undefined</)
})

test("rend les statuts, scores, confiance, warnings et opportunités textuellement", () => {
  const markup = renderToStaticMarkup(<MarketDashboardPage dashboard={buildMarketDashboard({ vehicles, listings: marketListingsFixture })} />)
  assert.match(markup, /Confiance/)
  assert.match(markup, /Score/)
  assert.match(markup, /marché/i)
  assert.match(markup, /données|prix|volume/i)
})

test("rend un état vide compréhensible", () => {
  const markup = renderToStaticMarkup(<MarketDashboardPage dashboard={buildMarketDashboard({ vehicles: [], listings: marketListingsFixture })} />)
  assert.match(markup, /Aucun véhicule à analyser/)
  assert.equal((markup.match(/<h1/g) ?? []).length, 1)
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { LeboncoinBridgeClient } from "./LeboncoinBridgeClient"

function withFetch<T>(fake: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = fake
  return run().finally(() => {
    globalThis.fetch = original
  })
}

test("un bridge injoignable (connexion refusée) produit un message clair, pas une erreur brute", async () => {
  const client = new LeboncoinBridgeClient("http://127.0.0.1:8080", "secret")
  await assert.rejects(
    () =>
      withFetch(
        // Simulates exactly what undici throws when nothing listens on the target port —
        // the same failure mode as the reported "Analyse impossible : fetch failed".
        (() => Promise.reject(new TypeError("fetch failed"))) as typeof fetch,
        () => client.search({ brand: "Peugeot", model: "308", text: "Peugeot 308", category: "VEHICULES_VOITURES" })
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /injoignable/)
      assert.match(error.message, /127\.0\.0\.1:8080/)
      assert.match(error.message, /LEBONCOIN_BRIDGE_URL/)
      assert.doesNotMatch(error.message, /^fetch failed$/)
      return true
    }
  )
})

test("une réponse HTTP en erreur reste distincte d'un bridge injoignable", async () => {
  const client = new LeboncoinBridgeClient("http://127.0.0.1:8080", "secret")
  const fake = (async () =>
    new Response(JSON.stringify({ error: { message: "Clé invalide" } }), {
      status: 401,
    })) as typeof fetch
  await assert.rejects(
    () => withFetch(fake, () => client.search({ brand: "Peugeot", model: "308", text: "Peugeot 308", category: "VEHICULES_VOITURES" })),
    /Clé invalide/
  )
})

test("une réponse réseau valide est parsée normalement", async () => {
  const client = new LeboncoinBridgeClient("http://127.0.0.1:8080", "secret")
  const listing = {
    id: "1", subject: "Peugeot 308", body: null, brand: "Peugeot", model: "308",
    url: "https://www.leboncoin.fr/ad/voitures/1", price: 15000, images: [], attributes: {},
    location: null, ownerType: "unknown", firstPublicationDate: null, favoriteCount: null,
  }
  const fake = (async () => new Response(JSON.stringify([listing]), { status: 200 })) as typeof fetch
  const result = await withFetch(fake, () => client.search({ brand: "Peugeot", model: "308", text: "Peugeot 308", category: "VEHICULES_VOITURES" }))
  assert.equal(result.length, 1)
  assert.equal(result[0].id, "1")
})

test("la clé interne est transmise sur chaque requête vers le bridge", async () => {
  const client = new LeboncoinBridgeClient("http://127.0.0.1:8080", "le-secret-interne")
  let capturedHeaders: HeadersInit | undefined
  const fake = (async (_url, init) => {
    capturedHeaders = init?.headers
    return new Response(JSON.stringify([]), { status: 200 })
  }) as typeof fetch
  await withFetch(fake, () => client.search({ brand: "Peugeot", model: "308", text: "Peugeot 308", category: "VEHICULES_VOITURES" }))
  assert.equal((capturedHeaders as Record<string, string>)["X-Internal-Api-Key"], "le-secret-interne")
})

test("les deux variables d'environnement attendues n'ont pas été renommées dans le code source", () => {
  const marketActions = readFileSync("src/features/market/actions.ts", "utf8")
  assert.match(marketActions, /process\.env\.LEBONCOIN_BRIDGE_URL/)
  assert.match(marketActions, /process\.env\.LEBONCOIN_BRIDGE_API_KEY/)
  assert.match(marketActions, /Le service d.analyse du marché n.est pas configuré\./)
  assert.match(marketActions, /Analyse impossible : \$\{message\}/)

  const acquisitionFactory = readFileSync(
    "src/features/acquisition/market/repositories/market-provider-factory.ts",
    "utf8"
  )
  assert.match(acquisitionFactory, /process\.env\.LEBONCOIN_BRIDGE_URL/)
  assert.match(acquisitionFactory, /process\.env\.LEBONCOIN_BRIDGE_API_KEY/)

  const acquisitionServiceFactory = readFileSync("src/features/acquisition/service-factory.ts", "utf8")
  assert.match(acquisitionServiceFactory, /process\.env\.LEBONCOIN_BRIDGE_URL/)
  assert.match(acquisitionServiceFactory, /process\.env\.LEBONCOIN_BRIDGE_API_KEY/)

  const rootEnvExample = readFileSync(".env.example", "utf8")
  assert.match(rootEnvExample, /^LEBONCOIN_BRIDGE_URL=/m)
  assert.match(rootEnvExample, /^LEBONCOIN_BRIDGE_API_KEY=/m)
})

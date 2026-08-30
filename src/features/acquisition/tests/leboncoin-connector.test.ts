import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { LeboncoinAcquisitionProvider } from "../providers/leboncoin-provider"
import { createVehicleAcquisitionService } from "../service-factory"

// `market-provider-factory.ts` starts with `import "server-only"`, which node:test cannot
// resolve outside a Next.js runtime (same constraint as every other server-only data file in
// this codebase) — its config-gating is verified below by reading its source instead of
// importing it directly, consistent with how the rest of this suite treats server-only files.

function withEnv(values: Record<string, string | undefined>, run: () => void) {
  const previous: Record<string, string | undefined> = {}
  for (const key of Object.keys(values)) previous[key] = process.env[key]
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    run()
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}

function withFetch<T>(fake: typeof fetch, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  globalThis.fetch = fake
  return run().finally(() => {
    globalThis.fetch = original
  })
}

test("createAcquisitionMarketProvider exige les deux mêmes variables que l'analyse marché", () => {
  const source = readFileSync("src/features/acquisition/market/repositories/market-provider-factory.ts", "utf8")
  assert.match(source, /process\.env\.LEBONCOIN_BRIDGE_URL/)
  assert.match(source, /process\.env\.LEBONCOIN_BRIDGE_API_KEY/)
  assert.match(source, /if \(!bridgeUrl \|\| !apiKey\) return null/)
})

test("createVehicleAcquisitionService échoue explicitement sans configuration (utilisé pour rachats et présence en ligne)", () => {
  withEnv({ LEBONCOIN_BRIDGE_URL: undefined, LEBONCOIN_BRIDGE_API_KEY: undefined }, () => {
    assert.throws(() => createVehicleAcquisitionService(), /bridge Leboncoin n.est pas configuré/)
  })
  withEnv({ LEBONCOIN_BRIDGE_URL: "http://127.0.0.1:8080", LEBONCOIN_BRIDGE_API_KEY: "secret" }, () => {
    assert.doesNotThrow(() => createVehicleAcquisitionService())
  })
})

test("un bridge injoignable produit un message explicite lors d'un rachat ou d'une actualisation de présence en ligne", async () => {
  const provider = new LeboncoinAcquisitionProvider("http://127.0.0.1:8080", "secret")
  await assert.rejects(
    () =>
      withFetch(
        (() => Promise.reject(new TypeError("fetch failed"))) as typeof fetch,
        () => provider.getListing("https://www.leboncoin.fr/ad/voitures/123456789")
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.match(error.message, /injoignable/)
      assert.match(error.message, /127\.0\.0\.1:8080/)
      assert.doesNotMatch(error.message, /^fetch failed$/)
      return true
    }
  )
})

test("les mêmes deux variables alimentent analyse marché et rachats (aucune configuration séparée)", () => {
  // Every consumer — market/actions.ts (analyse marché), market-provider-factory.ts (rachats,
  // recommandation d'achat) and service-factory.ts (import/rachat + présence en ligne) — reads
  // exactly LEBONCOIN_BRIDGE_URL and LEBONCOIN_BRIDGE_API_KEY, nothing renamed or duplicated.
  for (const file of [
    "src/features/market/actions.ts",
    "src/features/acquisition/market/repositories/market-provider-factory.ts",
    "src/features/acquisition/service-factory.ts",
  ]) {
    const source = readFileSync(file, "utf8")
    assert.match(source, /process\.env\.LEBONCOIN_BRIDGE_URL/)
    assert.match(source, /process\.env\.LEBONCOIN_BRIDGE_API_KEY/)
  }
  withEnv({ LEBONCOIN_BRIDGE_URL: "http://127.0.0.1:8080", LEBONCOIN_BRIDGE_API_KEY: "secret" }, () => {
    assert.doesNotThrow(() => createVehicleAcquisitionService())
  })
})

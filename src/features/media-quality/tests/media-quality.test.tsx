import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { MediaAiInsightEngine, MediaQualityEngine, MediaQualityReportBuilder, MediaQualityReportCard, buildMediaQualityViewModel, hammingDistance, histogramDistance } from ".."
import { MEDIA_QUALITY_PROMPT_VERSION } from "../prompts"
import type { MediaAiProvider, MediaQualityItem } from ".."

const item = (position: number, overrides: Partial<MediaQualityItem> = {}): MediaQualityItem => ({ id: `image-${position}`, position, url: `https://cdn.example/${position}.webp`, width: 1600, height: 1200, fileSize: 1_000_000, mimeType: "image/webp", hash: `hash-${position}`, perceptualHash: null, brightness: 0.5, histogram: [1, 2, 1], hasExif: true, variantNames: ["mobile", "desktop"], ready: true, ...overrides })
const items = (count: number) => Array.from({ length: count }, (_, index) => item(index + 1))

test("computes deterministic scores and complete 360 coverage", () => {
  const analysis = new MediaQualityEngine().analyze(items(24), "360")
  assert.equal(analysis.score, 100)
  assert.equal(analysis.blockers.length, 0)
  assert.equal(analysis.missingAngles.length, 0)
})

test("computes normalized histogram distance", () => {
  assert.equal(histogramDistance([1, 2, 1], [2, 4, 2]), 0)
  assert.equal(histogramDistance([], []), null)
})

test("detects exposure and histogram inconsistencies", () => {
  const analysis = new MediaQualityEngine().analyze([
    item(1, { brightness: 0.1, histogram: [10, 0, 0] }),
    item(2, { histogram: [0, 0, 10] }),
  ])
  assert.equal(analysis.warnings.some((warning) => warning.id === "exposure"), true)
  assert.equal(analysis.warnings.some((warning) => warning.id === "histogram"), true)
})

test("detects exact and near duplicates", () => {
  const analysis = new MediaQualityEngine().analyze([item(1, { perceptualHash: "00000000" }), item(2, { hash: "hash-1", perceptualHash: "00000001" })])
  assert.equal(analysis.warnings.some((warning) => warning.id === "exact-duplicates"), true)
  assert.equal(analysis.warnings.some((warning) => warning.id === "near-duplicates"), true)
  assert.equal(hammingDistance("00000000", "00000011"), 2)
})

test("validates missing positions, low resolution and inaccessible media", () => {
  const analysis = new MediaQualityEngine().analyze([item(1), item(3, { url: null, width: 300, height: 200 })], "360")
  assert.deepEqual(analysis.blockers.map((entry) => entry.id).sort(), ["access", "count", "order"])
  assert.equal(analysis.warnings.some((warning) => warning.id === "resolution"), true)
})

test("keeps deterministic blockers invariant when AI is excellent", () => {
  const deterministic = new MediaQualityEngine().analyze(items(2), "360")
  const report = new MediaQualityReportBuilder().build(deterministic, { summary: "Excellent", score: 100, findings: [], limitations: ["Analyse partielle"], provider: "fake", model: "fake" })
  assert.equal(report.state, "BLOCKER")
  assert.equal(report.deterministic.blockers.length > 0, true)
})

test("uses configurable 40/20/20/20 weights and degrades without AI", () => {
  const deterministic = new MediaQualityEngine().analyze(items(24), "360")
  assert.equal(new MediaQualityReportBuilder().build(deterministic, null).score, 100)
  assert.equal(new MediaQualityReportBuilder().build(deterministic, { summary: "Moyen", score: 50, findings: [], limitations: ["Test"], provider: "fake", model: "fake" }).score, 90)
})

test("AI provider input is limited to ten images", async () => {
  let received = 0
  const provider: MediaAiProvider = { id: "fake", model: "fake", analyze: async (input) => { received = input.items.length; return { summary: "Test", score: 80, findings: [], limitations: ["Test"], provider: "fake", model: "fake" } } }
  const result = await new MediaAiInsightEngine().analyze(items(15), provider)
  assert.equal(result.available, true)
  assert.equal(received, 10)
})

test("handles disabled AI and provider timeout", async () => {
  assert.equal((await new MediaAiInsightEngine().analyze(items(1), null)).available, false)
  const provider: MediaAiProvider = { id: "timeout", model: "fake", analyze: async () => { throw new DOMException("Timeout", "TimeoutError") } }
  assert.equal((await new MediaAiInsightEngine().analyze(items(1), provider)).available, false)
})

test("uses a versioned privacy-bounded vision prompt", () => {
  assert.equal(MEDIA_QUALITY_PROMPT_VERSION, "media-quality-v1")
  const source = readFileSync("src/features/media-quality/providers/openai-compatible-media-provider.ts", "utf8")
  assert.match(source, /slice\(0, 10\)/)
  assert.match(source, /detail: "low"/)
  assert.doesNotMatch(source, /seller|phone|email|notes/i)
})

test("builds an accessible premium report ViewModel", () => {
  const report = new MediaQualityReportBuilder().build(new MediaQualityEngine().analyze(items(24), "360"), null)
  const html = renderToStaticMarkup(<MediaQualityReportCard report={buildMediaQualityViewModel(report)} />)
  assert.match(html, /Qualité des médias/)
  assert.match(html, /étoile\(s\) sur 5/)
  assert.match(html, /Avant gauche validé/)
})

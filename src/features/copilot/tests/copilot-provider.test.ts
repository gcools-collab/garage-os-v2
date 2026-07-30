import assert from "node:assert/strict"
import test from "node:test"

import { FakeCopilotProvider } from "../providers/fake-copilot-provider"
import { CopilotStructuredResponseSchema } from "../validation"

const response = {
  answer: "Aucune priorité particulière.", summary: null,
  confidence: "HIGH" as const, dataStatus: "SUFFICIENT" as const,
  references: [], suggestedActions: [], warnings: [], followUpSuggestions: [],
  actionProposals: [],
}
const input = {
  systemPrompt: "prompt", messages: [], context: "{}",
  responseSchema: "{}", temperature: 0, maxTokens: 100, timeoutMs: 1000,
} as const

test("le faux fournisseur retourne une réponse et son usage", async () => {
  const result = await new FakeCopilotProvider(response).generateResponse(input)
  assert.deepEqual(CopilotStructuredResponseSchema.parse(result.structuredResponse), response)
  assert.equal(result.provider, "fake")
  assert.equal(result.usage.inputTokens, 100)
  assert.ok(result.latencyMs >= 0)
})

test("le faux fournisseur propage une erreur contrôlée", async () => {
  await assert.rejects(
    new FakeCopilotProvider(response, new Error("timeout")).generateResponse(input),
    /timeout/
  )
})

test("le parseur refuse JSON incomplet, URL et confiance invalides", () => {
  assert.equal(CopilotStructuredResponseSchema.safeParse({ answer: "Incomplet" }).success, false)
  assert.equal(CopilotStructuredResponseSchema.safeParse({ ...response, confidence: "CERTAIN" }).success, false)
  assert.equal(CopilotStructuredResponseSchema.safeParse({
    ...response,
    references: [{ entityType: "VEHICLE", entityId: "1", label: "Test", href: "x".repeat(301) }],
  }).success, false)
})

test("le parseur borne le payload structuré", () => {
  assert.equal(CopilotStructuredResponseSchema.safeParse({
    ...response, warnings: Array.from({ length: 9 }, () => "warning"),
  }).success, false)
  assert.equal(CopilotStructuredResponseSchema.safeParse({
    ...response, answer: "x".repeat(6001),
  }).success, false)
})

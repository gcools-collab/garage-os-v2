import "server-only"

import type {
  CopilotProvider,
  CopilotProviderInput,
  CopilotProviderResult,
} from "../types"

type ProviderEnvelope = {
  readonly choices?: readonly {
    readonly message?: { readonly content?: string | null }
    readonly finish_reason?: string | null
  }[]
  readonly usage?: {
    readonly prompt_tokens?: number
    readonly completion_tokens?: number
  }
}

export class OpenAiCompatibleCopilotProvider implements CopilotProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly endpoint = "https://api.openai.com/v1/chat/completions"
  ) {}

  async generateResponse(input: CopilotProviderInput): Promise<CopilotProviderResult> {
    const startedAt = Date.now()
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        temperature: input.temperature,
        max_tokens: input.maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: input.systemPrompt },
          ...input.messages,
          {
            role: "user",
            content: `<DATA>${input.context}</DATA>\nSchéma JSON attendu:\n${input.responseSchema}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(input.timeoutMs),
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`COPILOT_PROVIDER_${response.status}`)
    }
    const envelope = await response.json() as ProviderEnvelope
    const content = envelope.choices?.[0]?.message?.content?.trim()
    if (!content) throw new Error("COPILOT_PROVIDER_EMPTY")
    let structuredResponse: unknown
    try {
      structuredResponse = JSON.parse(content)
    } catch {
      throw new Error("COPILOT_PROVIDER_INVALID_RESPONSE")
    }
    return {
      content,
      structuredResponse,
      usage: {
        inputTokens: envelope.usage?.prompt_tokens ?? null,
        outputTokens: envelope.usage?.completion_tokens ?? null,
      },
      provider: "openai-compatible",
      model: this.model,
      finishReason: envelope.choices?.[0]?.finish_reason ?? null,
      latencyMs: Date.now() - startedAt,
    }
  }
}

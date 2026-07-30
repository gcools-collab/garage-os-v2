import type {
  CopilotProvider,
  CopilotProviderInput,
  CopilotProviderResult,
  CopilotStructuredResponse,
} from "../types"

export class FakeCopilotProvider implements CopilotProvider {
  constructor(
    private readonly response: CopilotStructuredResponse,
    private readonly error: Error | null = null
  ) {}

  async generateResponse(_input: CopilotProviderInput): Promise<CopilotProviderResult> {
    void _input
    if (this.error) throw this.error
    return {
      content: JSON.stringify(this.response),
      structuredResponse: this.response,
      usage: { inputTokens: 100, outputTokens: 50 },
      provider: "fake",
      model: "fake-v1",
      finishReason: "stop",
      latencyMs: 1,
    }
  }
}

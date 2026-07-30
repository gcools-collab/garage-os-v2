import type { CopilotProvider } from "@/features/copilot/types"
import type { AcquisitionMarketAiProvider } from "../types"

export class CopilotCompatibleMarketAiProvider implements AcquisitionMarketAiProvider {
  readonly id = "openai-compatible"
  readonly supportsVision = false

  constructor(private readonly provider: CopilotProvider) {}

  async generate(input: Parameters<AcquisitionMarketAiProvider["generate"]>[0]): Promise<unknown> {
    const result = await this.provider.generateResponse({
      systemPrompt: input.systemPrompt,
      messages: [],
      context: JSON.stringify(input.context),
      responseSchema: input.responseSchema,
      temperature: 0.1,
      maxTokens: 1_800,
      timeoutMs: input.timeoutMs,
    })
    return result.structuredResponse
  }
}

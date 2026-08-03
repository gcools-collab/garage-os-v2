import "server-only"
import { MEDIA_QUALITY_PROMPT_VERSION, MEDIA_QUALITY_SYSTEM_PROMPT } from "../prompts"
import type { MediaAiInsight, MediaQualityItem } from "../types"
import { mediaAiInsightSchema } from "../validation"
import type { MediaAiProvider } from "./media-ai-provider"

type Envelope = { readonly choices?: readonly { readonly message?: { readonly content?: string | null } }[] }

export class OpenAiCompatibleMediaProvider implements MediaAiProvider {
  readonly id = "openai-compatible"
  constructor(readonly model: string, private readonly apiKey: string, private readonly endpoint = "https://api.openai.com/v1/chat/completions") {}

  async analyze(input: { readonly items: readonly MediaQualityItem[]; readonly timeoutMs: number }): Promise<MediaAiInsight> {
    const selected = input.items.filter((item) => item.ready && item.url).slice(0, 10)
    const response = await fetch(this.endpoint, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` }, cache: "no-store",
      signal: AbortSignal.timeout(input.timeoutMs),
      body: JSON.stringify({ model: this.model, temperature: 0.1, max_tokens: 1800, response_format: { type: "json_object" }, messages: [
        { role: "system", content: `${MEDIA_QUALITY_SYSTEM_PROMPT}\nVersion: ${MEDIA_QUALITY_PROMPT_VERSION}` },
        { role: "user", content: [{ type: "text", text: "Analyse ces images et retourne JSON: summary, score, findings, limitations." }, ...selected.map((item) => ({ type: "image_url", image_url: { url: item.url as string, detail: "low" } }))] },
      ] }),
    })
    if (!response.ok) throw new Error(`MEDIA_AI_PROVIDER_${response.status}`)
    const envelope = await response.json() as Envelope
    const content = envelope.choices?.[0]?.message?.content
    if (!content) throw new Error("MEDIA_AI_PROVIDER_EMPTY")
    const parsed = mediaAiInsightSchema.safeParse(JSON.parse(content) as unknown)
    if (!parsed.success) throw new Error("MEDIA_AI_PROVIDER_INVALID_RESPONSE")
    return { ...parsed.data, provider: this.id, model: this.model }
  }
}

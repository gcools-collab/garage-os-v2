import type { MediaAiInsight, MediaQualityItem } from "../types"

export interface MediaAiProvider {
  readonly id: string
  readonly model: string
  analyze(input: { readonly items: readonly MediaQualityItem[]; readonly timeoutMs: number }): Promise<MediaAiInsight>
}

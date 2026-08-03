import type { MediaAiProvider } from "../providers"
import type { MediaAiInsight, MediaQualityItem } from "../types"

export type MediaAiResult = { readonly available: true; readonly insight: MediaAiInsight } | { readonly available: false; readonly insight: null; readonly message: string }
export class MediaAiInsightEngine {
  async analyze(items: readonly MediaQualityItem[], provider: MediaAiProvider | null, timeoutMs = 15_000): Promise<MediaAiResult> {
    if (!provider) return { available: false, insight: null, message: "Analyse IA désactivée." }
    try { return { available: true, insight: await provider.analyze({ items: items.slice(0, 10), timeoutMs }) } }
    catch (error) { console.error("Media AI analysis failed", { provider: provider.id, operation: "analyze", errorType: error instanceof Error ? error.name : "Unknown" }); return { available: false, insight: null, message: "Analyse IA momentanément indisponible." } }
  }
}

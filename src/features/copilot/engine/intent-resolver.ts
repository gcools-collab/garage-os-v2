import type { CopilotIntentResolution } from "../types"

const rules: readonly [readonly string[], CopilotIntentResolution["intent"]][] = [
  [["aujourd", "priorit", "premier", "impact"], "DAILY_PRIORITIES"],
  [["prospect", "lead", "rappel", "commercial"], "COMMERCIAL_OVERVIEW"],
  [["prix", "marché", "marché", "cher"], "PRICING_ANALYSIS"],
  [["publier", "publication", "annonce"], "PUBLICATION_ANALYSIS"],
  [["achat", "acquisition", "opportunité", "leboncoin"], "ACQUISITION_ANALYSIS"],
  [["marge", "rentab", "capital"], "PROFITABILITY_OVERVIEW"],
  [["stock", "véhicules", "voitures"], "STOCK_OVERVIEW"],
  [["pourquoi", "recommandation"], "RECOMMENDATION_EXPLANATION"],
] as const

export function resolveCopilotIntent(question: string): CopilotIntentResolution {
  const normalized = question.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
  const match = rules.find(([keywords]) => keywords.some((keyword) =>
    normalized.includes(keyword.normalize("NFD").replace(/\p{Diacritic}/gu, ""))
  ))
  if (match) return { intent: match[1], confidence: "HIGH" }
  if (/\b(audi|bmw|peugeot|renault|citroen|volkswagen|vehicule|voiture)\b/i.test(normalized)) {
    return { intent: "VEHICLE_ANALYSIS", confidence: "MEDIUM" }
  }
  if (/\b(comment|ou|garage os|fonctionne)\b/i.test(normalized)) {
    return { intent: "GENERAL_GARAGE_QUESTION", confidence: "MEDIUM" }
  }
  return { intent: "UNSUPPORTED", confidence: "LOW" }
}

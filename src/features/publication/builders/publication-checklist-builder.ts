import type { PublicationRuleResult } from "../types"
import type { PublicationChecklistItemViewModel } from "../presentation"

const stateLabels: Readonly<Record<PublicationRuleResult["state"], string>> = {
  PASS: "Prêt",
  WARNING: "À améliorer",
  BLOCKER: "Bloquant",
  NOT_APPLICABLE: "Non applicable",
}

export class PublicationChecklistBuilder {
  build(results: readonly PublicationRuleResult[]): readonly PublicationChecklistItemViewModel[] {
    return [...results]
      .sort((left, right) => left.order - right.order)
      .map((result) => ({
        id: result.id,
        title: result.title,
        description: result.description,
        state: result.state,
        stateLabel: stateLabels[result.state],
        severity: result.severity,
        actionLabel: result.suggestedAction,
        href: result.href,
      }))
  }
}

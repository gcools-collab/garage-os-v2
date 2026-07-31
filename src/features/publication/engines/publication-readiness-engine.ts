import type {
  PublicationReadiness,
  PublicationRuleResult,
} from "../types"

const RULE_POINTS: Record<PublicationRuleResult["state"], number> = {
  PASS: 100,
  WARNING: 50,
  BLOCKER: 0,
  NOT_APPLICABLE: 0,
}

export class PublicationReadinessEngine {
  calculate(results: readonly PublicationRuleResult[]): PublicationReadiness {
    const applicable = results.filter((result) => result.state !== "NOT_APPLICABLE")
    const score = applicable.length === 0
      ? 0
      : Math.round(
        applicable.reduce((total, item) => total + RULE_POINTS[item.state], 0)
        / applicable.length
      )
    const blockers = applicable.filter((result) => result.state === "BLOCKER")
    const warnings = applicable.filter((result) => result.state === "WARNING")
    return {
      score,
      canPublish: blockers.length === 0,
      passedCount: applicable.filter((result) => result.state === "PASS").length,
      applicableCount: applicable.length,
      blockers,
      warnings,
      results: [...results].sort((left, right) => left.order - right.order),
    }
  }
}

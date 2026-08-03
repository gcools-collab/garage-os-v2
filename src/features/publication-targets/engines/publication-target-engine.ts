import type { PublicationTargetProvider } from "../contracts"
import type {
  PublicationTargetAnalysis,
  PublicationTargetCapability,
  PublicationTargetId,
  PublicationTargetOperation,
  PublicationTargetProviderContext,
  PublicationTargetResult,
} from "../types"

export interface PublicationTargetEngineResult {
  readonly analyses: readonly PublicationTargetAnalysis[]
  readonly publishableCount: number
  readonly blockerCount: number
  readonly healthyCount: number
}

export class PublicationTargetEngine {
  constructor(private readonly providers: readonly PublicationTargetProvider[]) {}

  async analyze(input: {
    readonly context: PublicationTargetProviderContext
    readonly targetIds?: readonly PublicationTargetId[]
    readonly requiredCapabilities?: readonly PublicationTargetCapability[]
  }): Promise<PublicationTargetEngineResult> {
    const selected = input.targetIds
      ? this.providers.filter((provider) => input.targetIds?.includes(provider.target.id))
      : this.providers
    const analyses = await Promise.all(selected.map(async (provider): Promise<PublicationTargetAnalysis> => {
      const [validations, preview, health] = await Promise.all([
        provider.validate(input.context),
        provider.preview(input.context),
        provider.health(),
      ])
      const missingCapabilities = (input.requiredCapabilities ?? [])
        .filter((capability) => !provider.supports(capability))
      const hasBlocker = validations.some((validation) => validation.state === "BLOCKER")
      return {
        target: provider.target,
        health,
        validations,
        preview,
        canPublish: !hasBlocker && missingCapabilities.length === 0 && health !== "OFFLINE",
        missingCapabilities,
      }
    }))
    return {
      analyses,
      publishableCount: analyses.filter((analysis) => analysis.canPublish).length,
      blockerCount: analyses.reduce(
        (total, analysis) => total + analysis.validations.filter((item) => item.state === "BLOCKER").length,
        0
      ),
      healthyCount: analyses.filter((analysis) => analysis.health === "ONLINE").length,
    }
  }

  async execute(input: {
    readonly operation: PublicationTargetOperation
    readonly context: PublicationTargetProviderContext
    readonly targetIds: readonly PublicationTargetId[]
  }): Promise<readonly PublicationTargetResult[]> {
    const selected = this.providers.filter((provider) => input.targetIds.includes(provider.target.id))
    return Promise.all(selected.map((provider) => {
      if (input.operation === "PUBLISH") return provider.publish(input.context)
      if (input.operation === "UPDATE") return provider.update(input.context)
      return provider.unpublish(input.context)
    }))
  }
}

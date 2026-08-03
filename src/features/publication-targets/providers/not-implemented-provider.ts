import type { PublicationTargetProvider } from "../contracts"
import type {
  PublicationTarget,
  PublicationTargetCapability,
  PublicationTargetHealth,
  PublicationTargetId,
  PublicationTargetPreview,
  PublicationTargetProviderContext,
  PublicationTargetResult,
  PublicationTargetValidation,
} from "../types"

export abstract class NotImplementedPublicationTargetProvider implements PublicationTargetProvider {
  readonly target: PublicationTarget

  protected constructor(input: {
    readonly id: PublicationTargetId
    readonly name: string
    readonly description: string
    readonly capabilities: readonly PublicationTargetCapability[]
  }) {
    this.target = { ...input, status: "NOT_IMPLEMENTED" }
  }

  supports(capability: PublicationTargetCapability) {
    return this.target.capabilities.includes(capability)
  }

  async health(): Promise<PublicationTargetHealth> {
    return "UNKNOWN"
  }

  async validate(context: PublicationTargetProviderContext): Promise<readonly PublicationTargetValidation[]> {
    void context
    return [{
      id: "provider-implementation",
      label: "Connexion à la plateforme",
      state: "BLOCKER",
      message: "Ce provider n’est pas encore implémenté.",
    }]
  }

  async preview(context: PublicationTargetProviderContext): Promise<PublicationTargetPreview> {
    const vehicle = context.source.vehicle
    return {
      targetId: this.target.id,
      targetName: this.target.name,
      status: "NOT_IMPLEMENTED",
      simulatedUrl: null,
      title: [vehicle.make, vehicle.model, vehicle.version].filter(Boolean).join(" "),
      cover: null,
      description: "Aperçu indisponible tant que le provider n’est pas connecté.",
      capabilities: this.target.capabilities,
    }
  }

  async publish(context: PublicationTargetProviderContext): Promise<PublicationTargetResult> {
    void context
    return this.notImplemented("PUBLISH")
  }

  async update(context: PublicationTargetProviderContext): Promise<PublicationTargetResult> {
    void context
    return this.notImplemented("UPDATE")
  }

  async unpublish(context: PublicationTargetProviderContext): Promise<PublicationTargetResult> {
    void context
    return this.notImplemented("UNPUBLISH")
  }

  private notImplemented(operation: PublicationTargetResult["operation"]): PublicationTargetResult {
    return {
      targetId: this.target.id,
      operation,
      success: false,
      code: "NOT_IMPLEMENTED",
      message: `${this.target.name} n’est pas encore connecté à Garage OS.`,
      externalUrl: null,
    }
  }
}

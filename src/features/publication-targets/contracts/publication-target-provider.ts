import type {
  PublicationTarget,
  PublicationTargetCapability,
  PublicationTargetHealth,
  PublicationTargetPreview,
  PublicationTargetProviderContext,
  PublicationTargetResult,
  PublicationTargetValidation,
} from "../types"

export interface PublicationTargetProvider {
  readonly target: PublicationTarget
  publish(context: PublicationTargetProviderContext): Promise<PublicationTargetResult>
  update(context: PublicationTargetProviderContext): Promise<PublicationTargetResult>
  unpublish(context: PublicationTargetProviderContext): Promise<PublicationTargetResult>
  preview(context: PublicationTargetProviderContext): Promise<PublicationTargetPreview>
  validate(context: PublicationTargetProviderContext): Promise<readonly PublicationTargetValidation[]>
  health(): Promise<PublicationTargetHealth>
  supports(capability: PublicationTargetCapability): boolean
}

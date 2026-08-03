import { PublicationStatusBuilder, PublicationWorkspaceBuilder } from "@/features/publication"
import type { PublicationWorkspaceSource } from "@/features/publication"
import type {
  PublicationTargetProvider,
  PublicationTargetResult,
} from "@/features/publication-targets"
import type { PublicationExecutionRepository } from "../repositories"
import type {
  PublicationExecutionAction,
  PublicationExecutionEvent,
  PublicationExecutionResult,
  PublicationPersistenceCommand,
} from "../types"
import { PublicationLifecycleEngine } from "./publication-lifecycle-engine"

const vehicleStatuses = {
  DRAFT: "PURCHASED",
  IN_PREPARATION: "PREPARATION",
  READY: "READY_TO_PUBLISH",
  PUBLISHED: "PUBLISHED",
  RESERVED: "RESERVED",
  SOLD: "SOLD",
  ARCHIVED: "ARCHIVED",
} as const

const eventTypes = {
  MARK_READY: "VALIDATED",
  PUBLISH: "PUBLISHED",
  UNPUBLISH: "UNPUBLISHED",
  RESERVE: "RESERVED",
  SELL: "SOLD",
  ARCHIVE: "ARCHIVED",
} as const

const eventDescriptions = {
  MARK_READY: "Véhicule validé pour publication",
  PUBLISH: "Véhicule publié sur le site public",
  UNPUBLISH: "Véhicule dépublié du site public",
  RESERVE: "Véhicule réservé",
  SELL: "Véhicule vendu",
  ARCHIVE: "Véhicule archivé",
} as const

function providerOperation(
  provider: PublicationTargetProvider,
  action: PublicationExecutionAction,
  source: PublicationWorkspaceSource
): Promise<PublicationTargetResult> | null {
  const context = { source }
  if (action === "PUBLISH") return provider.publish(context)
  if (action === "UNPUBLISH" || action === "SELL" || action === "ARCHIVE") {
    return provider.unpublish(context)
  }
  if (action === "RESERVE") return provider.update(context)
  return null
}

export class PublicationExecutionEngine {
  constructor(
    private readonly provider: PublicationTargetProvider,
    private readonly repository: PublicationExecutionRepository,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(input: {
    readonly source: PublicationWorkspaceSource
    readonly actorId: string
    readonly action: PublicationExecutionAction
  }): Promise<PublicationExecutionResult> {
    const previousStatus = new PublicationStatusBuilder().resolve(input.source.vehicle)
    const nextStatus = new PublicationLifecycleEngine().resolve(previousStatus, input.action)
    if (!nextStatus) {
      return this.failure(input.source.vehicle.id, previousStatus, "INVALID_TRANSITION", "Cette transition de publication n’est pas autorisée.")
    }
    if (input.action === "MARK_READY" || input.action === "PUBLISH") {
      const workspace = new PublicationWorkspaceBuilder().build(input.source)
      if (!workspace.readiness.canPublish) {
        return this.failure(input.source.vehicle.id, previousStatus, "VALIDATION_FAILED", workspace.readiness.summary)
      }
    }

    const providerResult = await providerOperation(this.provider, input.action, input.source)
    if (providerResult && !providerResult.success) {
      return {
        ...this.failure(input.source.vehicle.id, previousStatus, "PROVIDER_ERROR", providerResult.message),
        providerResult,
      }
    }

    const occurredAt = this.now().toISOString()
    const event: PublicationExecutionEvent = {
      type: eventTypes[input.action],
      vehicleId: input.source.vehicle.id,
      garageId: input.source.vehicle.garageId,
      actorId: input.actorId,
      previousStatus,
      nextStatus,
      occurredAt,
      description: eventDescriptions[input.action],
      metadata: {
        provider: this.provider.target.id,
        publicationEvent: eventTypes[input.action],
      },
    }
    const command: PublicationPersistenceCommand = {
      vehicleId: input.source.vehicle.id,
      garageId: input.source.vehicle.garageId,
      expectedVehicleStatus: input.source.vehicle.status,
      targetVehicleStatus: vehicleStatuses[nextStatus],
      publicationStatus: nextStatus === "PUBLISHED" || nextStatus === "RESERVED"
        ? "PUBLISHED"
        : nextStatus === "READY" && previousStatus === "PUBLISHED"
          ? "UNPUBLISHED"
          : "DRAFT",
      publishedAt: nextStatus === "PUBLISHED"
        ? input.source.vehicle.publishedAt ?? occurredAt
        : input.source.vehicle.publishedAt,
      eventDatabaseType: input.action === "MARK_READY" || input.action === "UNPUBLISH"
        ? "MODIFIED"
        : vehicleStatuses[nextStatus],
      event,
    }
    const persisted = await this.repository.persist(command)
    if (!persisted) {
      return {
        ...this.failure(input.source.vehicle.id, previousStatus, "PERSISTENCE_ERROR", "La publication n’a pas pu être enregistrée."),
        providerResult,
      }
    }
    return {
      success: true,
      code: "SUCCESS",
      message: event.description,
      vehicleId: input.source.vehicle.id,
      previousStatus,
      nextStatus,
      event,
      providerResult,
    }
  }

  private failure(
    vehicleId: string,
    previousStatus: PublicationExecutionResult["previousStatus"],
    code: PublicationExecutionResult["code"],
    message: string
  ): PublicationExecutionResult {
    return { success: false, code, message, vehicleId, previousStatus, nextStatus: null, event: null, providerResult: null }
  }
}

import type { PublicationExecutionEvent } from "../types"

export interface PublicationEventViewModel {
  readonly title: string
  readonly description: string
  readonly occurredAt: string
  readonly context: readonly { readonly label: string; readonly value: string }[]
}

export function buildPublicationEventViewModel(
  event: PublicationExecutionEvent
): PublicationEventViewModel {
  return {
    title: event.type,
    description: event.description,
    occurredAt: event.occurredAt,
    context: [
      { label: "Véhicule", value: event.vehicleId },
      { label: "Garage", value: event.garageId },
      { label: "Statut précédent", value: event.previousStatus },
      { label: "Nouveau statut", value: event.nextStatus },
    ],
  }
}

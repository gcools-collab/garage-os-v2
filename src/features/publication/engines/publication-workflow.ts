import type { PublicationWorkflowStatus } from "../types"

const transitions: Readonly<Record<
  PublicationWorkflowStatus,
  readonly PublicationWorkflowStatus[]
>> = {
  DRAFT: ["READY"],
  IN_PREPARATION: ["READY"],
  READY: ["PUBLISHED"],
  PUBLISHED: ["READY", "RESERVED"],
  RESERVED: ["SOLD"],
  SOLD: ["ARCHIVED"],
  ARCHIVED: [],
}

export function getPublicationTransitions(status: PublicationWorkflowStatus) {
  return transitions[status]
}

export function isPublicationTransitionAllowed(
  currentStatus: PublicationWorkflowStatus,
  targetStatus: PublicationWorkflowStatus
) {
  return transitions[currentStatus].includes(targetStatus)
}

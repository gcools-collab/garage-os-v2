import type { PublicationWorkflowStatus } from "../types"

const transitions: Readonly<Record<
  PublicationWorkflowStatus,
  readonly PublicationWorkflowStatus[]
>> = {
  DRAFT: ["IN_PREPARATION", "READY", "ARCHIVED"],
  IN_PREPARATION: ["DRAFT", "READY", "ARCHIVED"],
  READY: ["IN_PREPARATION", "PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["IN_PREPARATION", "RESERVED", "SOLD", "ARCHIVED"],
  RESERVED: ["PUBLISHED", "SOLD", "ARCHIVED"],
  SOLD: ["ARCHIVED"],
  ARCHIVED: ["DRAFT"],
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

import type { PublicationWorkflowStatus } from "@/features/publication"
import type { PublicationExecutionAction } from "../types"

const transitions: Readonly<Record<
  PublicationWorkflowStatus,
  Partial<Record<PublicationExecutionAction, PublicationWorkflowStatus>>
>> = {
  DRAFT: { MARK_READY: "READY" },
  IN_PREPARATION: { MARK_READY: "READY" },
  READY: { PUBLISH: "PUBLISHED" },
  PUBLISHED: { UNPUBLISH: "READY", RESERVE: "RESERVED" },
  RESERVED: { SELL: "SOLD" },
  SOLD: { ARCHIVE: "ARCHIVED" },
  ARCHIVED: {},
}

export class PublicationLifecycleEngine {
  resolve(
    currentStatus: PublicationWorkflowStatus,
    action: PublicationExecutionAction
  ): PublicationWorkflowStatus | null {
    return transitions[currentStatus][action] ?? null
  }

  isAllowed(currentStatus: PublicationWorkflowStatus, action: PublicationExecutionAction) {
    return this.resolve(currentStatus, action) !== null
  }
}

import type { PublicationExecutionResult } from "../types"

export interface PublicationExecutionResultViewModel {
  readonly tone: "SUCCESS" | "ERROR"
  readonly title: string
  readonly message: string
  readonly statusLabel: string | null
}

export function buildPublicationExecutionResult(
  result: PublicationExecutionResult
): PublicationExecutionResultViewModel {
  return {
    tone: result.success ? "SUCCESS" : "ERROR",
    title: result.success ? "Publication mise à jour" : "Action impossible",
    message: result.message,
    statusLabel: result.nextStatus,
  }
}

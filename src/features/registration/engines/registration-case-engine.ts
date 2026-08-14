import type { RegistrationCaseStatus, RegistrationRequirement, RegistrationProgress } from "../types"

const transitions: Readonly<Record<RegistrationCaseStatus, readonly RegistrationCaseStatus[]>> = {
  NEW: ["WAITING_FOR_DOCUMENTS", "CANCELLED"], WAITING_FOR_DOCUMENTS: ["DOCUMENTS_RECEIVED", "CANCELLED"],
  DOCUMENTS_RECEIVED: ["UNDER_REVIEW", "WAITING_FOR_DOCUMENTS", "CANCELLED"], UNDER_REVIEW: ["INCOMPLETE", "READY", "CANCELLED"],
  INCOMPLETE: ["DOCUMENTS_RECEIVED", "CANCELLED"], READY: ["IN_PROGRESS", "CANCELLED"], IN_PROGRESS: ["COMPLETED", "CANCELLED"], COMPLETED: [], CANCELLED: [],
}
export const canTransitionRegistrationCase = (from: RegistrationCaseStatus, to: RegistrationCaseStatus) => transitions[from].includes(to)
export function calculateRegistrationProgress(requirements: readonly RegistrationRequirement[]): RegistrationProgress {
  const required = requirements.filter((item) => item.isRequired)
  const transmitted = required.filter((item) => item.status !== "MISSING" && item.status !== "REJECTED").length
  const accepted = required.filter((item) => item.status === "ACCEPTED").length
  const percent = (value: number) => required.length === 0 ? 100 : Math.round(value / required.length * 100)
  return { requiredCount: required.length, transmittedCount: transmitted, acceptedCount: accepted, transmittedPercent: percent(transmitted), acceptedPercent: percent(accepted), isComplete: accepted === required.length }
}

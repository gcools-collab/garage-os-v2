import type { AcquisitionStatus } from "../types/opportunity"

export const ACQUISITION_STATUS_LABELS: Readonly<Record<AcquisitionStatus, string>> = {
  NEW: "Nouvelle",
  IN_REVIEW: "À étudier",
  NEGOTIATING: "En négociation",
  ACCEPTED: "Acceptée",
  PURCHASED: "Achetée",
  REJECTED: "Refusée",
  EXPIRED: "Expirée",
}

const TRANSITIONS: Readonly<Record<AcquisitionStatus, readonly AcquisitionStatus[]>> = {
  NEW: ["IN_REVIEW", "REJECTED", "EXPIRED"],
  IN_REVIEW: ["NEGOTIATING", "ACCEPTED", "REJECTED", "EXPIRED"],
  NEGOTIATING: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: ["PURCHASED", "REJECTED"],
  PURCHASED: [],
  REJECTED: [],
  EXPIRED: [],
}

export function getAllowedAcquisitionTransitions(
  status: AcquisitionStatus
): readonly AcquisitionStatus[] {
  return TRANSITIONS[status]
}

export function canTransitionAcquisition(
  current: AcquisitionStatus,
  next: AcquisitionStatus
): boolean {
  return TRANSITIONS[current].includes(next)
}

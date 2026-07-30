import type { LeadStatus } from "../types"

const transitions: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  NEW: ["TO_CONTACT", "CONTACTED", "LOST", "ARCHIVED"],
  TO_CONTACT: ["CONTACTED", "LOST", "ARCHIVED"],
  CONTACTED: ["APPOINTMENT_PLANNED", "QUALIFIED", "LOST", "ARCHIVED"],
  APPOINTMENT_PLANNED: ["QUALIFIED", "WON", "LOST", "ARCHIVED"],
  QUALIFIED: ["APPOINTMENT_PLANNED", "WON", "LOST", "ARCHIVED"],
  LOST: ["ARCHIVED"],
  WON: ["ARCHIVED"],
  ARCHIVED: [],
}

export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus) {
  return transitions[from].includes(to)
}

export function getAvailableLeadStatuses(status: LeadStatus) {
  return transitions[status]
}

export function canManageLead(role: string | null, operation: "read" | "status" | "archive") {
  if (!role) return false
  if (operation === "read" || operation === "status") {
    return ["owner", "admin", "member"].includes(role)
  }
  return ["owner", "admin"].includes(role)
}

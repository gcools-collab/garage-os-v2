import type { LeadPriority, LeadStatus, LeadType } from "../types"

export function computeLeadPriority({
  status,
  type,
  createdAt,
  vehicleAvailable,
  now = new Date(),
}: {
  readonly status: LeadStatus
  readonly type: LeadType
  readonly createdAt: string
  readonly vehicleAvailable: boolean
  readonly now?: Date
}): LeadPriority {
  if (status === "ARCHIVED" || status === "LOST" || status === "WON") return "LOW"
  const ageHours = (now.getTime() - Date.parse(createdAt)) / 3_600_000
  if (
    status === "NEW" &&
    (["APPOINTMENT_REQUEST", "TEST_DRIVE_REQUEST", "TEST_DRIVE", "TRADE_IN"].includes(type) || ageHours >= 24)
  ) return "HIGH"
  return vehicleAvailable ? "NORMAL" : "LOW"
}

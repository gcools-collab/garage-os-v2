export const marketplaceLinkStatuses = ["ACTIVE", "INACTIVE", "REMOVED", "UNKNOWN"] as const

export type MarketplaceLinkStatus = (typeof marketplaceLinkStatuses)[number]

export const marketplaceLinkStatusLabels: Record<MarketplaceLinkStatus, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  REMOVED: "Supprimée",
  UNKNOWN: "Statut inconnu",
}

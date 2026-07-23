import type { LiveVehicleStatus } from "../../types"

export const liveVehicleStatusLabels: Record<LiveVehicleStatus, string> = {
  available: "Disponible",
  reserved: "Réservé",
  unavailable: "Indisponible",
}

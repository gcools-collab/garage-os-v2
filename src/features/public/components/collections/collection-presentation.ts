export function formatVehicleCount(count: number) {
  return `${new Intl.NumberFormat("fr-FR").format(count)} ${
    count === 1 ? "véhicule" : "véhicules"
  }`
}

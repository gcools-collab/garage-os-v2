const number = new Intl.NumberFormat("fr-FR")

export function formatVehicleMileage(mileage: number | null): string {
  return mileage === null
    ? "Kilométrage non renseigné"
    : `${number.format(mileage)} km`
}

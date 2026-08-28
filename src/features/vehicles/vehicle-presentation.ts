const number = new Intl.NumberFormat("fr-FR")

const KNOWN_MAKE_LABELS: Readonly<Record<string, string>> = {
  mg: "MG",
  bmw: "BMW",
  vw: "VW",
  ds: "DS",
}

const KNOWN_MODEL_LABELS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  MG: { mgb: "MGB", midget: "Midget", tf: "TF" },
}

function formatVehicleBrandLabel(brand: string): string {
  const trimmed = brand.trim()
  return KNOWN_MAKE_LABELS[trimmed.toLowerCase()] ?? trimmed
}

function formatVehicleModelLabel(model: string, makeLabel: string): string {
  const trimmed = model.trim()
  const known = KNOWN_MODEL_LABELS[makeLabel]?.[trimmed.toLowerCase()]
  if (known) return known
  if (/^[A-Za-z]{2,4}$/.test(trimmed) && trimmed === trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()) {
    return trimmed.toUpperCase()
  }
  return trimmed
}

export function formatPublicVehicleDisplayName(make: string, model: string): string {
  const makeLabel = formatVehicleBrandLabel(make)
  const modelLabel = formatVehicleModelLabel(model, makeLabel)
  return `${makeLabel} ${modelLabel}`.trim()
}

export function formatVehicleMileage(mileage: number | null): string {
  return mileage === null
    ? "Kilométrage non renseigné"
    : `${number.format(mileage)} km`
}

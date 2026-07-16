import type { DraftVehicle } from "./types"

const knownBrands = [
  "Alfa Romeo",
  "Audi",
  "BMW",
  "Citroën",
  "Dacia",
  "DS",
  "Fiat",
  "Ford",
  "Honda",
  "Hyundai",
  "Jaguar",
  "Kia",
  "Land Rover",
  "Mazda",
  "Mercedes",
  "Mini",
  "Nissan",
  "Opel",
  "Peugeot",
  "Porsche",
  "Renault",
  "Seat",
  "Škoda",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
] as const

function normalized(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? ""
}

function uniqueParts(parts: string[]) {
  return parts.filter(
    (part, index) =>
      parts.findIndex(
        (candidate) =>
          candidate.toLocaleLowerCase("fr") === part.toLocaleLowerCase("fr")
      ) === index
  )
}

function isLikelyVariantOnly(value: string) {
  return /^(?:v\d{1,2}|gt(?:\s+line)?|rs|bluehdi(?:\s+\d+)?|hdi(?:\s+\d+)?|puretech(?:\s+\d+)?|dci(?:\s+\d+)?|tdi(?:\s+\d+)?|tsi(?:\s+\d+)?|phev|hybrid)$/i.test(
    value
  )
}

function extractDescriptionTitle(draft: DraftVehicle) {
  const firstLine = normalized(draft.description?.split(/\r?\n/).find(normalized))
  const words = firstLine.split(" ")
  if (!firstLine || firstLine.length > 100 || words.length < 2 || words.length > 10) {
    return null
  }

  const lowerLine = firstLine.toLocaleLowerCase("fr")
  const identifiedBrand = knownBrands.find((brand) =>
    lowerLine.includes(brand.toLocaleLowerCase("fr"))
  )
  if (!identifiedBrand || /[.!?]$/.test(firstLine)) return null

  const model = normalized(draft.model)
  if (model && !lowerLine.includes(model.toLocaleLowerCase("fr"))) return null

  return firstLine
}

export function getVehicleDisplayTitle(draft: DraftVehicle) {
  const provider = draft.provider.toLocaleLowerCase("fr")
  const brand = normalized(draft.brand)
  const model = normalized(draft.model)
  const trim = normalized(draft.trim)

  if (
    brand &&
    model &&
    !isLikelyVariantOnly(model) &&
    brand.toLocaleLowerCase("fr") !== provider &&
    model.toLocaleLowerCase("fr") !== provider
  ) {
    return uniqueParts([brand, model, trim].filter(Boolean)).join(" ")
  }

  return extractDescriptionTitle(draft) ?? "Véhicule à identifier"
}

export function hasIdentifiedBrandAndModel(draft: DraftVehicle) {
  const brand = normalized(draft.brand)
  const model = normalized(draft.model)
  const provider = draft.provider.toLocaleLowerCase("fr")
  return Boolean(
    brand &&
      model &&
      !isLikelyVariantOnly(model) &&
      brand.toLocaleLowerCase("fr") !== provider &&
      model.toLocaleLowerCase("fr") !== provider
  )
}

export function getVehicleSummary(draft: DraftVehicle) {
  const title = getVehicleDisplayTitle(draft)
  const details = [
    draft.year ? `de ${draft.year}` : null,
    draft.characteristics.fuel?.toLocaleLowerCase("fr") ?? null,
    draft.characteristics.gearbox
      ? `boîte ${draft.characteristics.gearbox.toLocaleLowerCase("fr")}`
      : null,
    draft.mileage !== null
      ? `${draft.mileage.toLocaleString("fr-FR")} km`
      : null,
    draft.characteristics.powerDin !== null
      ? `${draft.characteristics.powerDin} ch`
      : null,
    draft.characteristics.color
      ? `couleur ${draft.characteristics.color.toLocaleLowerCase("fr")}`
      : null,
  ].filter((detail): detail is string => Boolean(detail))

  if (details.length === 0) {
    return `${title}. Les caractéristiques principales restent à compléter.`
  }

  const lastDetail = details.at(-1)
  const beginning = details.slice(0, -1)
  return `${title} ${beginning.join(", ")}${beginning.length ? " et " : ""}${lastDetail}.`
}

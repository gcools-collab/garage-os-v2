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

function normalizedToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
}

export function deduplicateModelFromTrim(model: string, trim: string) {
  const split = (value: string) =>
    value
      .trim()
      .split(/[\s\-_/|·.]+/)
      .filter(Boolean)
  const modelTokens = split(model)
  const trimTokens = split(trim)

  if (modelTokens.length === 0) return trimTokens.join(" ")

  while (
    trimTokens.length >= modelTokens.length &&
    modelTokens.every(
      (token, index) =>
        normalizedToken(token) === normalizedToken(trimTokens[index])
    )
  ) {
    trimTokens.splice(0, modelTokens.length)
  }

  return trimTokens.join(" ")
}

function isLikelyVariantOnly(value: string) {
  return /^(?:v\d{1,2}|gt(?:\s+line)?|rs|bluehdi(?:\s+\d+)?|hdi(?:\s+\d+)?|puretech(?:\s+\d+)?|dci(?:\s+\d+)?|tdi(?:\s+\d+)?|tsi(?:\s+\d+)?|phev|hybrid)$/i.test(
    value
  )
}

function cleanOriginalTitle(draft: DraftVehicle) {
  const originalTitle = normalized(draft.originalTitle)
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/[|•·_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!originalTitle || originalTitle.length > 120) return null

  const lowerTitle = originalTitle.toLocaleLowerCase("fr")
  const hasBrand = knownBrands.some((brand) =>
    lowerTitle.includes(brand.toLocaleLowerCase("fr"))
  )
  return hasBrand ? originalTitle : null
}

export function getVehicleDisplayTitle(draft: DraftVehicle) {
  const provider = draft.provider.toLocaleLowerCase("fr")
  const brand = normalized(draft.brand)
  const model = normalized(draft.model)
  const trim = deduplicateModelFromTrim(model, normalized(draft.trim))

  if (
    brand &&
    model &&
    !isLikelyVariantOnly(model) &&
    brand.toLocaleLowerCase("fr") !== provider &&
    model.toLocaleLowerCase("fr") !== provider
  ) {
    const displayBrand =
      knownBrands.find(
        (candidate) =>
          candidate.toLocaleLowerCase("fr") === brand.toLocaleLowerCase("fr")
      ) ?? brand
    return uniqueParts([displayBrand, model, trim].filter(Boolean)).join(" ")
  }

  return cleanOriginalTitle(draft) ?? "Véhicule à identifier"
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
    draft.location ? `à ${draft.location}` : null,
  ].filter((detail): detail is string => Boolean(detail))

  if (details.length === 0) {
    return `${title}. Les caractéristiques principales restent à compléter.`
  }

  const lastDetail = details.at(-1)
  const beginning = details.slice(0, -1)
  return `${title} ${beginning.join(", ")}${beginning.length ? " et " : ""}${lastDetail}.`
}

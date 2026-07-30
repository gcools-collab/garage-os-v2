function normalizeSlugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function buildVehicleSlug({
  id,
  make,
  model,
  version,
  year,
}: {
  readonly id: string
  readonly make: string
  readonly model: string
  readonly version?: string | null
  readonly year?: number | null
}) {
  const identity = [make, model, version, year ? String(year) : null]
    .filter((part): part is string => Boolean(part))
    .map(normalizeSlugPart)
    .filter(Boolean)
    .join("-")
  const suffix = id.replace(/-/g, "").slice(0, 8).toLowerCase()
  return `${identity || "vehicule"}-${suffix}`
}

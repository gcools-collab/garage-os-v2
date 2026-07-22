const normalize = (value: string | null | undefined) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()

const BMW_GENERIC_MODELS = new Set(["", "serie 3", "series 3", "3 series", "autres", "other"])
const BMW_M3_MODEL = /^m3(?:\s+(?:f80|competition|cs))(?:\s|$)|^m3$/
const BMW_M3_TITLE = /(?:^|\s)bmw\s+m3(?:\s|$)/

export type ModelIdentity = {
  brand: string | null | undefined
  model: string | null | undefined
  title?: string | null
}

export function normalizeVehicleIdentity(value: string | null | undefined) {
  return normalize(value)
}

export function getModelFamily(identity: ModelIdentity): string | null {
  const brand = normalize(identity.brand)
  const model = normalize(identity.model)
  if (!brand || !model && !identity.title) return null

  if (brand === "bmw") {
    if (BMW_M3_MODEL.test(model)) return "bmw:m3"
    if (BMW_GENERIC_MODELS.has(model) && BMW_M3_TITLE.test(normalize(identity.title))) {
      return "bmw:m3"
    }
  }

  return model ? `${brand}:${model}` : null
}

export function modelsAreComparable(target: ModelIdentity, candidate: ModelIdentity) {
  const targetFamily = getModelFamily(target)
  const candidateFamily = getModelFamily(candidate)
  return targetFamily !== null && targetFamily === candidateFamily
}

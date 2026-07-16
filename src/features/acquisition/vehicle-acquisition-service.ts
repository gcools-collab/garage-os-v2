import type {
  DraftVehicle,
  VehicleAcquisitionProvider,
} from "./types"

export class UnsupportedAcquisitionProviderError extends Error {
  constructor() {
    super("Cette source d'annonce n'est pas encore prise en charge.")
    this.name = "UnsupportedAcquisitionProviderError"
  }
}

export class VehicleAcquisitionService {
  constructor(private readonly providers: readonly VehicleAcquisitionProvider[]) {}

  async acquire(sourceUrl: string): Promise<DraftVehicle> {
    let url: URL

    try {
      url = new URL(sourceUrl)
    } catch {
      throw new Error("L'URL de l'annonce est invalide.")
    }

    if (url.protocol !== "https:") {
      throw new Error("L'URL de l'annonce doit utiliser HTTPS.")
    }

    const provider = this.providers.find((candidate) => candidate.supports(url))
    if (!provider) {
      throw new UnsupportedAcquisitionProviderError()
    }

    const listing = await provider.getListing(url.toString())

    return {
      ...listing,
      provider: provider.id,
      sourceUrl: url.toString(),
      photos: [...new Set(listing.photos)].slice(0, 10),
      characteristics: { ...listing.characteristics },
    }
  }
}

export type AcquisitionProviderId = "leboncoin" | (string & {})

export type DraftVehicleCharacteristics = {
  fuel: string | null
  gearbox: string | null
  powerDin: number | null
  color: string | null
  doors: number | null
  seats: number | null
  [key: string]: string | number | boolean | null
}

export type DraftVehicle = {
  provider: AcquisitionProviderId
  sourceUrl: string
  externalId: string
  publishedAt: string | null
  brand: string
  model: string
  trim: string | null
  year: number | null
  mileage: number | null
  advertisedPrice: number | null
  description: string | null
  photos: string[]
  characteristics: DraftVehicleCharacteristics
}

export type AcquisitionListing = Omit<DraftVehicle, "provider" | "sourceUrl">

export interface VehicleAcquisitionProvider {
  readonly id: AcquisitionProviderId
  supports(url: URL): boolean
  getListing(url: string): Promise<AcquisitionListing>
}

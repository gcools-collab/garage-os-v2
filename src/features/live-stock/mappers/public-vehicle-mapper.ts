import { resolveVehicleImagePublicUrl } from "@/features/vehicles/vehicle-image-presentation"
import type {
  LiveStockVehicle,
  LiveVehiclePhoto,
  PublicVehicleImageRecord,
  PublicVehicleRecord,
} from "../types"

function cents(value: number | null) {
  return value === null || !Number.isFinite(value) || value < 0 ? null : Math.round(value * 100)
}

export function mapPublicVehicleImages({
  vehicle,
  images,
}: {
  readonly vehicle: PublicVehicleRecord
  readonly images: readonly PublicVehicleImageRecord[]
}): readonly LiveVehiclePhoto[] {
  return images
    .filter((image) =>
      image.vehicle_id === vehicle.id &&
      image.garage_id === vehicle.garage_id &&
      image.storage_path.startsWith(`${vehicle.garage_id}/${vehicle.id}/`)
    )
    .sort((first, second) =>
      Number(second.is_primary) - Number(first.is_primary) ||
      (first.display_order ?? 0) - (second.display_order ?? 0) ||
      first.created_at.localeCompare(second.created_at) ||
      first.id.localeCompare(second.id)
    )
    .flatMap((image, position) => {
      const url = resolveVehicleImagePublicUrl({
        url: null,
        storagePath: image.storage_path,
        garageId: vehicle.garage_id,
        vehicleId: vehicle.id,
      })
      if (!url) return []
      return [{
        id: image.id,
        path: image.storage_path,
        url,
        alt: `${vehicle.brand} ${vehicle.model} — photo ${position + 1}`,
        position,
        isCover: image.is_primary,
        width: null,
        height: null,
      } satisfies LiveVehiclePhoto]
    })
}

export function mapPublicVehicle(
  record: PublicVehicleRecord,
  images: readonly PublicVehicleImageRecord[],
  immersive: { readonly exterior360: boolean; readonly interiorTour: boolean } = { exterior360: false, interiorTour: false },
): LiveStockVehicle {
  const version = record.version?.trim() || null
  return {
    id: record.id,
    garageId: record.garage_id,
    slug: record.live_slug,
    make: record.brand.trim(),
    model: record.model.trim(),
    version,
    title: [record.brand, record.model, version].filter(Boolean).join(" "),
    year: record.year,
    mileageKm: record.mileage,
    fuelType: record.fuel,
    transmission: record.gearbox,
    bodyType: record.body_type,
    powerHp: record.power_din,
    fiscalPower: record.fiscal_power,
    doors: record.doors,
    seats: record.seats,
    color: record.color,
    registrationDate: record.first_registration_date,
    priceCents: cents(record.selling_price),
    previousPriceCents: null,
    description: record.description,
    equipment: [],
    status: record.status,
    publicationStatus: record.publication_status,
    publishedAt: record.published_at,
    soldAt: null,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    co2Emissions: record.co2_emissions,
    critAir: record.crit_air,
    euroStandard: record.euro_standard,
    ownersCount: record.owners_count,
    photos: mapPublicVehicleImages({ vehicle: record, images }),
    hasExterior360: immersive.exterior360,
    hasInteriorTour: immersive.interiorTour,
  }
}

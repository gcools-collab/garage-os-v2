import type { LiveVehicleMetadataItem, Vehicle } from "../../types"

export type VehicleMetaItem = {
  id: "year" | "mileage" | "fuel" | "gearbox"
  label: string
}

export function getVehicleMetaItems(vehicle: Vehicle): VehicleMetaItem[] {
  return [
    vehicle.year ? { id: "year" as const, label: String(vehicle.year) } : null,
    vehicle.mileage !== undefined
      ? {
          id: "mileage" as const,
          label: `${new Intl.NumberFormat("fr-FR").format(vehicle.mileage)} km`,
        }
      : null,
    vehicle.fuel?.trim()
      ? { id: "fuel" as const, label: vehicle.fuel.trim() }
      : null,
    vehicle.gearbox?.trim()
      ? { id: "gearbox" as const, label: vehicle.gearbox.trim() }
      : null,
  ].filter((item): item is VehicleMetaItem => item !== null)
}

export function VehicleMeta({
  items,
}: {
  items: Array<Pick<LiveVehicleMetadataItem, "id" | "value">>
}) {
  if (items.length === 0) return null
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--live-muted-foreground)]">
      {items.map((item) => (
        <div key={item.id}>
          <dt className="sr-only">{item.id}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

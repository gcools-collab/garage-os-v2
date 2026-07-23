import type { LiveVehicleTrustItem } from "../../types"
import { VehicleTrustCard } from "./VehicleTrustCard"

export function VehicleTrustSection({ items }: { items: LiveVehicleTrustItem[] }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="vehicle-trust-title">
      <h2 id="vehicle-trust-title" className="text-2xl font-semibold tracking-tight">
        Acheter en toute confiance
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <VehicleTrustCard key={item.id} item={item} />)}
      </div>
    </section>
  )
}

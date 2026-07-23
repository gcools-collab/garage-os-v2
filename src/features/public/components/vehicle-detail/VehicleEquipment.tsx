import { Check } from "lucide-react"
import type { LiveVehicleEquipmentGroup } from "../../types"

export function VehicleEquipment({ groups }: { groups: LiveVehicleEquipmentGroup[] }) {
  if (groups.length === 0) return null
  return (
    <section aria-labelledby="vehicle-equipment-title">
      <h2 id="vehicle-equipment-title" className="text-2xl font-semibold tracking-tight">
        Équipements et options
      </h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((group) => (
          <div key={group.id}>
            <h3 className="font-semibold">{group.title}</h3>
            <ul className="mt-4 space-y-3">
              {group.items.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[var(--live-primary)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

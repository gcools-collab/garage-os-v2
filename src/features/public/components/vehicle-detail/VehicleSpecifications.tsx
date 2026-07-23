import type { LiveVehicleSpecificationGroup } from "../../types"

export function VehicleSpecifications({
  groups,
}: {
  groups: LiveVehicleSpecificationGroup[]
}) {
  if (groups.length === 0) return null
  return (
    <section aria-labelledby="vehicle-specifications-title">
      <h2 id="vehicle-specifications-title" className="text-2xl font-semibold tracking-tight">
        Caractéristiques
      </h2>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] p-5 sm:p-6">
            <h3 className="font-semibold">{group.title}</h3>
            <dl className="mt-4 divide-y divide-[var(--live-border)]">
              {group.items.map((item) => (
                <div key={item.label} className="flex justify-between gap-5 py-3">
                  <dt className="text-sm text-[var(--live-muted-foreground)]">{item.label}</dt>
                  <dd className="text-right text-sm font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  )
}

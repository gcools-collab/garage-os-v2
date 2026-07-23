import { Check } from "lucide-react"
import type { LiveVehicleDescription } from "../../types"

export function VehicleDescriptionSection({
  description,
}: {
  description: LiveVehicleDescription
}) {
  if (!description.introduction && description.highlights.length === 0) return null

  return (
    <section aria-labelledby="vehicle-description-title">
      <h2 id="vehicle-description-title" className="text-2xl font-semibold tracking-tight">
        À propos de ce véhicule
      </h2>
      {description.introduction && (
        <p className="mt-5 max-w-4xl text-base leading-8 text-[var(--live-muted-foreground)]">
          {description.introduction}
        </p>
      )}
      {description.highlights.length > 0 && (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {description.highlights.map((highlight) => (
            <li key={highlight} className="flex items-start gap-3">
              <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-[var(--live-primary)]" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

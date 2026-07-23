import type { LiveVehicleDetail } from "../../types"
import { LiveButton } from "../ui"

export function VehicleContactActions({
  actions,
}: {
  actions: LiveVehicleDetail["contactActions"]
}) {
  if (actions.length === 0) return null

  return (
    <section
      aria-labelledby="vehicle-contact-title"
      className="rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-muted)] p-5 sm:p-6"
    >
      <h2 id="vehicle-contact-title" className="text-xl font-semibold">
        Ce véhicule vous intéresse ?
      </h2>
      <p className="mt-2 text-sm leading-6 text-[var(--live-muted-foreground)]">
        Notre équipe est disponible pour répondre à vos questions.
      </p>
      <div className="mt-5 flex flex-col gap-3">
        {actions.map((action) => (
          <LiveButton
            key={action.id}
            action={action}
            variant={action.variant}
          />
        ))}
      </div>
    </section>
  )
}

import { Check, Minus } from "lucide-react"
import type { PublicationTargetViewModel } from "../presentation"

export function TargetCapabilityList({
  capabilities,
}: {
  readonly capabilities: PublicationTargetViewModel["capabilities"]
}) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Capacités de diffusion">
      {capabilities.map((capability) => (
        <li
          key={capability.id}
          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
        >
          {capability.supported
            ? <Check className="size-3" aria-hidden="true" />
            : <Minus className="size-3 text-muted-foreground" aria-hidden="true" />}
          {capability.label}
          <span className="sr-only">{capability.supported ? " prise en charge" : " non prise en charge"}</span>
        </li>
      ))}
    </ul>
  )
}

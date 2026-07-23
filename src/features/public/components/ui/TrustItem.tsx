import { Check } from "lucide-react"
import type { TrustItem as TrustItemModel } from "../../types"

export function TrustItem({ item }: { item: TrustItemModel }) {
  return (
    <li className="flex items-center gap-2 text-sm text-[var(--live-muted-foreground)]">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[var(--live-border)] text-[var(--live-foreground)]">
        <Check aria-hidden="true" className="size-3" />
      </span>
      {item.label}
    </li>
  )
}

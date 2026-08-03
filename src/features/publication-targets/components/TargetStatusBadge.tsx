import { Badge } from "@/components/ui/badge"
import type { PublicationTargetViewModel } from "../presentation"

export function TargetStatusBadge({
  target,
}: {
  readonly target: Pick<PublicationTargetViewModel, "statusLabel" | "canPublish">
}) {
  return <Badge variant={target.canPublish ? "secondary" : "outline"}>{target.statusLabel}</Badge>
}

import type { AssetThumbnailViewModel } from "../types"
import { AssetImage } from "./AssetImage"

export function AssetThumbnail({
  thumbnail,
}: {
  readonly thumbnail: AssetThumbnailViewModel
}) {
  return (
    <div
      aria-label={thumbnail.positionLabel}
      aria-current={thumbnail.selected ? "true" : undefined}
      className="aspect-square overflow-hidden rounded-lg border data-[selected=true]:ring-2"
      data-selected={thumbnail.selected}
    >
      <AssetImage image={thumbnail.image} sizes="8rem" />
    </div>
  )
}

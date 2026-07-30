import Image from "next/image"
import type { AssetImageViewModel } from "../types"
import { AssetBadge } from "./AssetBadge"

export function AssetImage({
  image,
  priority = false,
  sizes = "100vw",
}: {
  readonly image: AssetImageViewModel
  readonly priority?: boolean
  readonly sizes?: string
}) {
  return (
    <figure className="relative size-full overflow-hidden bg-muted">
      <Image
        src={image.source.url}
        alt={image.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
      />
      {image.badge ? <span className="absolute left-3 top-3"><AssetBadge label={image.badge} /></span> : null}
      {image.caption ? <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm text-white">{image.caption}</figcaption> : null}
    </figure>
  )
}

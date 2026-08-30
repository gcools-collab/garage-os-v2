"use client"

import Image from "next/image"
import { useState } from "react"
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
  const [failed, setFailed] = useState(false)
  const remote = /^https?:\/\//i.test(image.source.url.trim())

  if (failed) {
    return (
      <div
        role="img"
        aria-label={`${image.alt} — image indisponible`}
        className="grid size-full place-items-center bg-muted px-4 text-center text-sm text-muted-foreground"
      >
        Photo à venir
      </div>
    )
  }

  return (
    <figure className="relative size-full overflow-hidden bg-muted">
      <Image
        src={image.source.url}
        alt={image.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
        unoptimized={remote}
        onError={() => setFailed(true)}
      />
      {image.badge ? <span className="absolute left-3 top-3"><AssetBadge label={image.badge} /></span> : null}
      {image.caption ? <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 px-3 py-2 text-sm text-white">{image.caption}</figcaption> : null}
    </figure>
  )
}

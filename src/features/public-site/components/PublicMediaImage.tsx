"use client"

import Image from "next/image"
import { useState } from "react"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"

export function PublicMediaImage({
  src,
  alt,
  priority = false,
  sizes = "100vw",
  className,
}: {
  readonly src: string
  readonly alt: string
  readonly priority?: boolean
  readonly sizes?: string
  readonly className?: string
}) {
  const [failed, setFailed] = useState(false)
  const usable = isResolvableVehicleImageUrl(src) && !failed

  if (!usable) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-[var(--live-surface-muted)] px-4 text-center text-sm text-[var(--live-muted-foreground)]">
        Photo à venir
      </div>
    )
  }

  const remote = /^https?:\/\//i.test(src.trim())
  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      unoptimized={remote}
      onError={() => setFailed(true)}
    />
  )
}

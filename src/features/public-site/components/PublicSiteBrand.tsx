"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"
import type { GaragePublicViewModel } from "../types"

export function PublicSiteBrand({
  garage,
  compact = false,
}: {
  readonly garage: GaragePublicViewModel
  readonly compact?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const logoUrl = garage.logoUrl && isResolvableVehicleImageUrl(garage.logoUrl) && !failed
    ? garage.logoUrl
    : null
  const remote = Boolean(logoUrl && /^https?:\/\//i.test(logoUrl))
  return (
    <Link
      href={garage.homeHref}
      aria-label={`Accueil ${garage.name}`}
      className="flex min-h-10 min-w-0 max-w-[11rem] items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)] sm:max-w-[14rem] lg:max-w-[16rem]"
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={garage.name}
          width={192}
          height={48}
          unoptimized={remote}
          onError={() => setFailed(true)}
          className={compact
            ? "h-8 w-auto max-w-[8.5rem] object-contain object-left"
            : "h-9 w-auto max-w-[10rem] object-contain object-left sm:h-10 md:h-12 md:max-w-[12rem]"}
        />
      ) : (
        <span className={`min-w-0 truncate font-semibold tracking-tight ${compact ? "text-sm" : "text-sm sm:text-base"}`}>
          {garage.name}
        </span>
      )}
    </Link>
  )
}

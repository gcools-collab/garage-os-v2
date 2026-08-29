import Image from "next/image"
import Link from "next/link"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"
import type { GaragePublicViewModel } from "../types"

export function PublicSiteBrand({ garage }: { readonly garage: GaragePublicViewModel }) {
  const logoUrl = garage.logoUrl && isResolvableVehicleImageUrl(garage.logoUrl) ? garage.logoUrl : null
  const remote = Boolean(logoUrl && /^https?:\/\//i.test(logoUrl))
  return (
    <Link
      href={garage.homeHref}
      aria-label={`Accueil ${garage.name}`}
      className="flex min-h-10 items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)]"
    >
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt={garage.name}
          width={192}
          height={48}
          unoptimized={remote}
          className="h-10 w-auto max-w-[10rem] object-contain object-left md:h-12 md:max-w-[12rem]"
        />
      ) : (
        <span className="font-semibold tracking-tight">{garage.name}</span>
      )}
    </Link>
  )
}

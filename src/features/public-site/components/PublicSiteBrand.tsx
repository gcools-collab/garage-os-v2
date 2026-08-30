"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { isResolvableVehicleImageUrl } from "@/features/vehicles/vehicle-image-presentation"
import { findLogoContentBox, punchWhitePixels } from "../presentation/logo-crop"
import type { GaragePublicViewModel } from "../types"

export type PublicSiteBrandPlacement = "header" | "footer" | "menu"

const imageClassName: Record<PublicSiteBrandPlacement, string> = {
  header: "h-14 w-auto max-h-14 max-w-[16rem] bg-transparent object-contain object-left sm:h-16 sm:max-h-16 sm:max-w-[20rem]",
  menu: "h-14 w-auto max-h-14 max-w-[16rem] bg-transparent object-contain object-left",
  footer: "h-14 w-auto max-h-14 max-w-[18rem] bg-transparent object-contain object-left",
}

const linkClassName: Record<PublicSiteBrandPlacement, string> = {
  header: "flex min-h-14 min-w-0 max-w-[16rem] items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)] sm:min-h-16 sm:max-w-[20rem]",
  menu: "flex min-h-14 min-w-0 max-w-[16rem] items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)]",
  footer: "flex min-h-14 min-w-0 max-w-[18rem] items-center focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-focus-ring)]",
}

function cropLogoSrc(source: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new window.Image()
    image.decoding = "async"
    if (/^https?:\/\//i.test(source)) image.crossOrigin = "anonymous"
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext("2d", { willReadFrequently: true })
        if (!context || !image.naturalWidth || !image.naturalHeight) {
          resolve(null)
          return
        }
        context.drawImage(image, 0, 0)
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
        const box = findLogoContentBox(pixels.data, pixels.width, pixels.height)
        const punched = punchWhitePixels(pixels.data)
        if (!box && !punched) {
          resolve(null)
          return
        }
        context.putImageData(pixels, 0, 0)
        if (!box) {
          resolve(canvas.toDataURL("image/png"))
          return
        }
        const cropped = document.createElement("canvas")
        cropped.width = box.width
        cropped.height = box.height
        const croppedContext = cropped.getContext("2d")
        if (!croppedContext) {
          resolve(null)
          return
        }
        croppedContext.drawImage(
          canvas,
          box.left,
          box.top,
          box.width,
          box.height,
          0,
          0,
          box.width,
          box.height,
        )
        resolve(cropped.toDataURL("image/png"))
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    image.src = source
  })
}

export function PublicSiteBrand({
  garage,
  compact = false,
  placement,
}: {
  readonly garage: GaragePublicViewModel
  readonly compact?: boolean
  readonly placement?: PublicSiteBrandPlacement
}) {
  const resolvedPlacement = placement ?? (compact ? "header" : "footer")
  const [failed, setFailed] = useState(false)
  const [cropped, setCropped] = useState<{ readonly source: string; readonly src: string } | null>(null)
  const source = garage.logoUrl && isResolvableVehicleImageUrl(garage.logoUrl) && !failed
    ? garage.logoUrl
    : null
  const displaySrc = cropped?.source === source ? cropped.src : source
  const framed = Boolean(source && cropped?.source === source)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    void cropLogoSrc(source).then((src) => {
      if (!cancelled && src) setCropped({ source, src })
    })
    return () => {
      cancelled = true
    }
  }, [source])

  return (
    <Link
      href={garage.homeHref}
      aria-label={`Accueil ${garage.name}`}
      className={linkClassName[resolvedPlacement]}
    >
      {source ? (
        // eslint-disable-next-line @next/next/no-img-element -- garage logos stay object-contain without next/image cropping
        <img
          src={displaySrc ?? source}
          alt={garage.name}
          onError={() => setFailed(true)}
          className={`${imageClassName[resolvedPlacement]}${framed ? "" : " mix-blend-multiply"}`}
        />
      ) : (
        <span className={`min-w-0 truncate font-semibold tracking-tight ${resolvedPlacement === "menu" ? "text-sm" : "text-sm sm:text-base"}`}>
          {garage.name}
        </span>
      )}
    </Link>
  )
}

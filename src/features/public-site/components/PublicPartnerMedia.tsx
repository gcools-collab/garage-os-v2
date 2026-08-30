"use client"

import { useState } from "react"

export function PublicPartnerMedia({
  src,
  alt,
  attribution,
}: {
  readonly src: string
  readonly alt: string
  readonly attribution?: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    <figure className="mt-8 overflow-hidden rounded-3xl border border-[var(--live-border)] bg-[var(--live-surface)]">
      {failed ? (
        <div className="grid min-h-40 place-items-center px-6 py-10 text-center sm:min-h-48">
          <p className="text-lg font-semibold">CarGo</p>
          <p className="mt-2 text-sm text-[var(--live-muted-foreground)]">Partenaire location · visuel momentanément indisponible</p>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- static partner asset must not go through next/image
        <img
          src={src}
          alt={alt}
          className="h-auto w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
      {attribution ? (
        <figcaption className="px-5 py-3 text-sm text-[var(--live-muted-foreground)]">{attribution}</figcaption>
      ) : null}
    </figure>
  )
}

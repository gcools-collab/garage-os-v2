import Image from "next/image"
import Link from "next/link"

import type { PublicationTargetViewModel } from "../presentation"

export function TargetPreview({
  preview,
}: {
  readonly preview: PublicationTargetViewModel["preview"]
}) {
  return (
    <div className="grid gap-4 rounded-lg bg-muted/30 p-4 sm:grid-cols-[8rem_1fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
        {preview.cover ? (
          <Image
            src={preview.cover.url}
            alt={preview.cover.alt}
            fill
            sizes="128px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            Aucun aperçu
          </div>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-medium">{preview.title}</h3>
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{preview.description}</p>
        {preview.url ? (
          <Link href={preview.url} className="mt-2 block truncate text-sm underline underline-offset-4">
            {preview.url}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

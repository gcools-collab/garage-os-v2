import { ArrowUpRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { VisibleCollection } from "../../types"
import { formatVehicleCount } from "./collection-presentation"

export function CollectionCard({
  collection,
}: {
  collection: VisibleCollection
}) {
  return (
    <article className="group relative isolate min-h-[28rem] overflow-hidden rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] transition duration-300 lg:hover:-translate-y-1 lg:hover:border-[var(--live-primary)] motion-reduce:transform-none motion-reduce:transition-none">
      <Image
        src={collection.resolvedCoverImageUrl}
        alt={`Collection ${collection.name}`}
        fill
        sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) calc(50vw - 2.5rem), (max-width: 1536px) calc(33vw - 2.5rem), 410px"
        className="-z-20 object-cover transition duration-300 lg:group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none"
      />
      <div
        aria-hidden="true"
        className="-z-10 absolute inset-0 bg-gradient-to-t from-[var(--live-surface)] via-[var(--live-surface)]/70 to-transparent"
      />

      <div className="flex min-h-[28rem] flex-col justify-end p-6 sm:p-7">
        <p className="text-sm font-medium text-[var(--live-muted-foreground)]">
          {formatVehicleCount(collection.availableVehicleCount)}
        </p>
        <h3 className="mt-2 text-2xl font-semibold tracking-tight">
          {collection.name}
        </h3>
        {collection.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--live-muted-foreground)]">
            {collection.description}
          </p>
        )}
        <Link
          href={`/vehicles?collection=${encodeURIComponent(collection.slug)}`}
          className="mt-6 inline-flex w-fit items-center gap-2 rounded-[var(--live-control-radius)] text-sm font-semibold text-[var(--live-foreground)] underline-offset-4 transition duration-200 lg:hover:gap-3 lg:hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)] motion-reduce:transition-none"
          aria-label={`Découvrir la collection ${collection.name}`}
        >
          Découvrir
          <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </article>
  )
}

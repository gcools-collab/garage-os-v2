import type { VisibleCollection } from "../../types"
import { SectionHeader } from "../ui"
import { CollectionCard } from "./CollectionCard"

export function CollectionsSection({
  collections,
}: {
  collections: VisibleCollection[]
}) {
  if (collections.length === 0) return null

  return (
    <section
      aria-label="Collections de véhicules"
      className="bg-[var(--live-background)] px-5 py-20 sm:px-8 sm:py-24 lg:py-28"
    >
      <div className="mx-auto max-w-[var(--live-content-width)]">
        <SectionHeader
          eyebrow="Collections"
          title="Explorez notre sélection"
          description="Découvrez nos univers automobiles soigneusement sélectionnés."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </div>
    </section>
  )
}

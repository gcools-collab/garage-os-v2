import type { AssetGalleryViewModel, AssetPlaceholderViewModel } from "../types"
import { AssetImage } from "./AssetImage"
import { AssetPlaceholder } from "./AssetPlaceholder"
import { AssetThumbnail } from "./AssetThumbnail"

export function AssetGallery({
  gallery,
}: {
  readonly gallery: AssetGalleryViewModel | AssetPlaceholderViewModel
}) {
  if (gallery.empty) return <AssetPlaceholder placeholder={gallery} />
  return (
    <section aria-label="Galerie des médias" className="space-y-3">
      <div className="aspect-[16/10] overflow-hidden rounded-xl">
        <AssetImage
          image={gallery.cover}
          priority
          sizes="(max-width: 767px) 100vw, 75vw"
        />
      </div>
      {gallery.thumbnails.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
          {gallery.thumbnails.map((thumbnail) => (
            <AssetThumbnail key={thumbnail.id} thumbnail={thumbnail} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

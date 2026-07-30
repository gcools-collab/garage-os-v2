import { AssetGallery } from "@/features/media"
import type { VehicleDetailPageViewModel } from "../presentation"
import { VehicleSection } from "./VehicleSection"

export function VehicleGallerySection({
  gallery,
  capabilities,
}: {
  readonly gallery: VehicleDetailPageViewModel["gallery"]
  readonly capabilities: VehicleDetailPageViewModel["galleryCapabilities"]
}) {
  return (
    <VehicleSection id="vehicle-gallery" title="Galerie immersive" description="Découvrez le véhicule sous tous les angles.">
      <AssetGallery gallery={gallery} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button disabled className="rounded-lg border border-[var(--live-border)] px-4 py-2 text-sm disabled:opacity-60">Précédent</button>
        <button disabled className="rounded-lg border border-[var(--live-border)] px-4 py-2 text-sm disabled:opacity-60">Suivant</button>
        <button disabled className="rounded-lg border border-[var(--live-border)] px-4 py-2 text-sm disabled:opacity-60">Plein écran</button>
        <button disabled className="rounded-lg border border-[var(--live-border)] px-4 py-2 text-sm disabled:opacity-60">Zoom</button>
        <span className="rounded-lg bg-[var(--live-surface-muted)] px-4 py-2 text-sm text-[var(--live-muted-foreground)]">360° à venir</span>
        <span className="rounded-lg bg-[var(--live-surface-muted)] px-4 py-2 text-sm text-[var(--live-muted-foreground)]">Vidéo à venir</span>
      </div>
      <span className="sr-only">Navigation, plein écran et zoom prévus par contrat : {capabilities.navigation}, {capabilities.fullscreen}, {capabilities.zoom}.</span>
    </VehicleSection>
  )
}

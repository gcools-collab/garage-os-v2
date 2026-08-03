import { PremiumAssetGallery } from "@/features/public-site-premium/components/PremiumAssetGallery"
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
      <PremiumAssetGallery gallery={gallery} />
      <span className="sr-only">
        Navigation, plein écran et zoom disponibles. Contrats : {capabilities.navigation}, {capabilities.fullscreen}, {capabilities.zoom}.
      </span>
    </VehicleSection>
  )
}

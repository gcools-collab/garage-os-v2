import Link from "next/link"
import type { LiveVehicleDetail } from "../../types"
import { VehicleContactActions } from "./VehicleContactActions"
import { VehicleDescriptionSection } from "./VehicleDescriptionSection"
import { VehicleDetailHero } from "./VehicleDetailHero"
import { VehicleEquipment } from "./VehicleEquipment"
import { VehicleGallery } from "./VehicleGallery"
import { SimilarVehiclesSection } from "./SimilarVehiclesSection"
import { VehicleSpecifications } from "./VehicleSpecifications"
import { VehicleSummary } from "./VehicleSummary"
import { VehicleTrustSection } from "./VehicleTrustSection"

export function VehicleDetailPage({
  detail,
}: {
  detail: LiveVehicleDetail
}) {
  return (
    <article className="bg-[var(--live-background)] px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[var(--live-content-width)]">
        <nav aria-label="Fil d’Ariane">
          <ol className="flex flex-wrap items-center gap-2 text-sm text-[var(--live-muted-foreground)]">
            <li><Link className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)]" href="/">Accueil</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)]" href="/vehicles">Véhicules</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-[var(--live-foreground)]">{detail.displayName}</li>
          </ol>
        </nav>

        <div className="mt-10">
          <VehicleDetailHero detail={detail} />
        </div>

        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.45fr)] lg:gap-8">
          <VehicleGallery images={detail.images} displayName={detail.displayName} />
          <aside className="space-y-5 lg:sticky lg:top-24">
            <VehicleSummary detail={detail} />
            <VehicleContactActions actions={detail.contactActions} />
          </aside>
        </div>

        <div className="mt-16 space-y-16 sm:mt-20 sm:space-y-20">
          <VehicleDescriptionSection description={detail.description} />
          <VehicleSpecifications groups={detail.specifications} />
          <VehicleEquipment groups={detail.equipmentGroups} />
          <VehicleTrustSection items={detail.trustItems} />
          <SimilarVehiclesSection vehicles={detail.similarVehicles} />
        </div>
      </div>
    </article>
  )
}

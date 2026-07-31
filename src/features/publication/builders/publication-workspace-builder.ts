import { VehicleDetailPageBuilder } from "@/features/public-site/vehicle-detail"
import { PublicationReadinessEngine } from "../engines"
import type { PublicationWorkspaceViewModel } from "../presentation"
import type { PublicationWorkspaceSource } from "../types"
import { PublicationValidationEngine } from "../validators"
import { PublicationActionBuilder } from "./publication-action-builder"
import { PublicationChecklistBuilder } from "./publication-checklist-builder"
import { PublicationStatusBuilder } from "./publication-status-builder"

function readinessColor(score: number): "RED" | "ORANGE" | "GREEN" {
  if (score < 50) return "RED"
  if (score < 85) return "ORANGE"
  return "GREEN"
}

export class PublicationWorkspaceBuilder {
  build(source: PublicationWorkspaceSource): PublicationWorkspaceViewModel {
    const validationResults = new PublicationValidationEngine().validate(source)
    const readiness = new PublicationReadinessEngine().calculate(validationResults)
    const checklist = new PublicationChecklistBuilder().build(readiness.results)
    const statusBuilder = new PublicationStatusBuilder()
    const status = statusBuilder.resolve(source.vehicle)
    const detail = new VehicleDetailPageBuilder().build({
      garage: source.garage,
      vehicle: source.vehicle,
    })
    const blockerIds = new Set(readiness.blockers.map((item) => item.id))
    const warningIds = new Set(readiness.warnings.map((item) => item.id))
    const vehicleTitle = [
      source.vehicle.make,
      source.vehicle.model,
      source.vehicle.version,
    ].filter(Boolean).join(" ")
    return {
      vehicleId: source.vehicle.id,
      title: "Espace de publication",
      subtitle: vehicleTitle,
      backHref: `/stock/${source.vehicle.id}`,
      workflow: statusBuilder.build(status),
      readiness: {
        score: readiness.score,
        color: readinessColor(readiness.score),
        progressLabel: `${readiness.passedCount} contrôles validés sur ${readiness.applicableCount}`,
        summary: readiness.canPublish
          ? readiness.warnings.length > 0
            ? "La publication est possible, avec quelques améliorations recommandées."
            : "Le véhicule est prêt à être publié."
          : `${readiness.blockers.length} blocage${readiness.blockers.length > 1 ? "s" : ""} à lever avant publication.`,
        canPublish: readiness.canPublish,
        statusAnnouncement: `Préparation à ${readiness.score} %. ${readiness.blockers.length} blocage et ${readiness.warnings.length} avertissement.`,
      },
      checklist,
      blockers: checklist.filter((item) => blockerIds.has(item.id)),
      warnings: checklist.filter((item) => warningIds.has(item.id)),
      publicPreview: {
        publicUrl: detail.seo.canonicalPath,
        vehicleTitle: detail.hero.title,
        price: detail.pricing.mainPrice,
        cover: detail.hero.cover === null ? null : {
          url: detail.hero.cover.source.url,
          alt: detail.hero.cover.alt,
        },
        available: status === "PUBLISHED",
      },
      seoPreview: {
        title: detail.seo.title,
        description: detail.seo.description,
        slug: source.vehicle.slug,
        canonicalPath: detail.seo.canonicalPath,
        openGraphImage: detail.seo.openGraphImage,
      },
      actions: new PublicationActionBuilder().build(status, readiness),
    }
  }
}

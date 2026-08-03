import { VehicleDetailPageBuilder } from "@/features/public-site/vehicle-detail"
import type { PublicationTargetProvider } from "../contracts"
import type {
  PublicationTargetCapability,
  PublicationTargetHealth,
  PublicationTargetPreview,
  PublicationTargetProviderContext,
  PublicationTargetResult,
  PublicationTargetValidation,
} from "../types"

const capabilities = [
  "PHOTOS", "PRICE", "DESCRIPTION", "EQUIPMENT", "SEO", "CONTACT", "FINANCING", "REPRISE",
] as const satisfies readonly PublicationTargetCapability[]

function validation(
  id: string,
  label: string,
  passed: boolean,
  message: string
): PublicationTargetValidation {
  return { id, label, state: passed ? "PASS" : "BLOCKER", message }
}

export class PublicWebsiteProvider implements PublicationTargetProvider {
  readonly target = {
    id: "PUBLIC_WEBSITE",
    name: "Site public",
    description: "Site Garage OS Live du garage.",
    status: "READY",
    capabilities,
  } as const

  supports(capability: PublicationTargetCapability) {
    return capabilities.includes(capability as (typeof capabilities)[number])
  }

  async health(): Promise<PublicationTargetHealth> {
    return "ONLINE"
  }

  async validate(context: PublicationTargetProviderContext): Promise<readonly PublicationTargetValidation[]> {
    const vehicle = context.source.vehicle
    return [
      validation("slug", "Slug", /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vehicle.slug), "Une adresse publique valide est requise."),
      validation("cover", "Cover", vehicle.photos.some((photo) => photo.isCover), "Une photo principale est requise."),
      validation("media", "Médias", vehicle.photos.length > 0, "Au moins un média est requis."),
      validation("description", "Description", Boolean(vehicle.description?.trim()), "Une description est requise."),
      validation("price", "Prix", vehicle.priceCents !== null && vehicle.priceCents > 0, "Un prix positif est requis."),
      validation("identity", "Données obligatoires", Boolean(vehicle.make.trim() && vehicle.model.trim()), "La marque et le modèle sont requis."),
    ]
  }

  async preview(context: PublicationTargetProviderContext): Promise<PublicationTargetPreview> {
    const detail = new VehicleDetailPageBuilder().build({
      garage: context.source.garage,
      vehicle: context.source.vehicle,
    })
    return {
      targetId: this.target.id,
      targetName: this.target.name,
      status: context.source.vehicle.publicationStatus === "PUBLISHED" ? "PUBLISHED" : "READY",
      simulatedUrl: detail.seo.canonicalPath,
      title: [detail.hero.title, detail.hero.version].filter(Boolean).join(" "),
      cover: detail.hero.cover ? {
        url: detail.hero.cover.source.url,
        alt: detail.hero.cover.alt,
      } : null,
      description: detail.seo.description,
      capabilities,
    }
  }

  async publish(context: PublicationTargetProviderContext): Promise<PublicationTargetResult> {
    const validations = await this.validate(context)
    if (validations.some((item) => item.state === "BLOCKER")) {
      return this.validationFailure("PUBLISH")
    }
    return this.successResult("PUBLISH", (await this.preview(context)).simulatedUrl)
  }

  async update(context: PublicationTargetProviderContext): Promise<PublicationTargetResult> {
    const validations = await this.validate(context)
    if (validations.some((item) => item.state === "BLOCKER")) {
      return this.validationFailure("UPDATE")
    }
    return this.successResult("UPDATE", (await this.preview(context)).simulatedUrl)
  }

  async unpublish(context: PublicationTargetProviderContext): Promise<PublicationTargetResult> {
    return this.successResult("UNPUBLISH", (await this.preview(context)).simulatedUrl)
  }

  private validationFailure(operation: PublicationTargetResult["operation"]): PublicationTargetResult {
    return {
      targetId: this.target.id,
      operation,
      success: false,
      code: "VALIDATION_FAILED",
      message: "La publication Site public contient des éléments bloquants.",
      externalUrl: null,
    }
  }

  private successResult(
    operation: PublicationTargetResult["operation"],
    externalUrl: string | null
  ): PublicationTargetResult {
    return {
      targetId: this.target.id,
      operation,
      success: true,
      code: "SUCCESS",
      message: "Le provider Site public a validé l’opération.",
      externalUrl,
    }
  }
}

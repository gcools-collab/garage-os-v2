import type {
  PublicationRuleResult,
  PublicationWorkspaceSource,
} from "../types"

type RuleContext = PublicationWorkspaceSource
type RuleDefinition = {
  readonly id: string
  readonly title: string
  readonly order: number
  readonly evaluate: (context: RuleContext) => Omit<PublicationRuleResult, "id" | "title" | "order">
}

function result(
  state: PublicationRuleResult["state"],
  description: string,
  suggestedAction: string | null,
  href: string | null
): Omit<PublicationRuleResult, "id" | "title" | "order"> {
  return {
    state,
    description,
    severity: state === "BLOCKER" ? "CRITICAL" : state === "WARNING" ? "WARNING" : "SUCCESS",
    suggestedAction,
    href,
  }
}

function vehicleHref(context: RuleContext, anchor: string) {
  return `/stock/${context.vehicle.id}${anchor}`
}

const rules: readonly RuleDefinition[] = [
  {
    id: "garage-active", title: "Garage actif", order: 10,
    evaluate: (context) => context.garageActive
      ? result("PASS", "Le garage est actif.", null, null)
      : result("BLOCKER", "Le garage doit être actif pour publier.", "Activer le garage", "/settings"),
  },
  {
    id: "branding", title: "Identité du garage", order: 20,
    evaluate: (context) => context.brandingConfigured
      ? result("PASS", "L’identité publique du garage est configurée.", null, null)
      : result("BLOCKER", "Le branding public du garage est incomplet.", "Configurer le branding", "/settings/branding"),
  },
  {
    id: "identity", title: "Identité du véhicule", order: 30,
    evaluate: (context) => context.vehicle.make.trim() && context.vehicle.model.trim()
      ? result("PASS", "La marque et le modèle sont renseignés.", null, null)
      : result("BLOCKER", "L’identité commerciale du véhicule est incomplète.", "Compléter l’identité", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "brand", title: "Marque", order: 40,
    evaluate: (context) => context.vehicle.make.trim()
      ? result("PASS", "La marque est renseignée.", null, null)
      : result("BLOCKER", "La marque est obligatoire.", "Renseigner la marque", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "model", title: "Modèle", order: 50,
    evaluate: (context) => context.vehicle.model.trim()
      ? result("PASS", "Le modèle est renseigné.", null, null)
      : result("BLOCKER", "Le modèle est obligatoire.", "Renseigner le modèle", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "price", title: "Prix de vente", order: 60,
    evaluate: (context) => context.vehicle.priceCents !== null && context.vehicle.priceCents > 0
      ? result("PASS", "Le prix de vente est prêt.", null, null)
      : result("BLOCKER", "Un prix de vente positif est requis.", "Ajouter le prix", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "cover", title: "Photo de couverture", order: 70,
    evaluate: (context) => context.vehicle.photos.some((photo) => photo.isCover)
      ? result("PASS", "Une photo principale est définie.", null, null)
      : result("BLOCKER", "Aucune photo principale n’est définie.", "Définir la couverture", vehicleHref(context, "#vehicle-photos")),
  },
  {
    id: "media-count", title: "Galerie média", order: 80,
    evaluate: (context) => context.vehicle.photos.length >= 3
      ? result("PASS", `${context.vehicle.photos.length} médias sont disponibles.`, null, null)
      : result("WARNING", "Ajoutez au moins trois photos pour une annonce convaincante.", "Ajouter des photos", vehicleHref(context, "#vehicle-photos")),
  },
  {
    id: "description", title: "Description", order: 90,
    evaluate: (context) => (context.vehicle.description?.trim().length ?? 0) >= 80
      ? result("PASS", "La description commerciale est suffisamment détaillée.", null, null)
      : result("WARNING", "La description gagnerait à être plus détaillée.", "Enrichir la description", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "characteristics", title: "Caractéristiques", order: 100,
    evaluate: (context) => [
      context.vehicle.fuelType,
      context.vehicle.transmission,
      context.vehicle.bodyType,
    ].filter(Boolean).length >= 2
      ? result("PASS", "Les caractéristiques essentielles sont renseignées.", null, null)
      : result("WARNING", "Les caractéristiques techniques sont incomplètes.", "Compléter les caractéristiques", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "year", title: "Année", order: 110,
    evaluate: (context) => context.vehicle.year !== null
      ? result("PASS", "L’année est renseignée.", null, null)
      : result("WARNING", "L’année n’est pas renseignée.", "Ajouter l’année", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "mileage", title: "Kilométrage", order: 120,
    evaluate: (context) => context.vehicle.mileageKm !== null
      ? result("PASS", "Le kilométrage est renseigné.", null, null)
      : result("WARNING", "Le kilométrage n’est pas renseigné.", "Ajouter le kilométrage", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "slug", title: "Adresse publique", order: 130,
    evaluate: (context) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(context.vehicle.slug)
      ? result("PASS", "L’adresse publique est disponible.", null, null)
      : result("BLOCKER", "Le slug public est absent ou invalide.", "Corriger l’adresse", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "seo", title: "SEO minimal", order: 140,
    evaluate: (context) =>
      context.vehicle.make.trim()
      && context.vehicle.model.trim()
      && Boolean(context.vehicle.description?.trim())
      && context.vehicle.photos.some((photo) => photo.isCover)
        ? result("PASS", "Le minimum SEO est disponible.", null, null)
        : result("WARNING", "Le titre, la description ou l’image SEO sont incomplets.", "Compléter le contenu", vehicleHref(context, "#vehicle-information")),
  },
  {
    id: "vehicle-360", title: "Visite extérieure 360°", order: 150,
    evaluate: (context) => {
      const visit = context.vehicle360
      if (!visit || visit.state === "NOT_APPLICABLE") return result("NOT_APPLICABLE", "La visite 360° est facultative.", null, null)
      if (visit.state === "PASS") return result("PASS", visit.description, null, visit.href)
      return result("WARNING", visit.description, "Finaliser la visite 360°", visit.href)
    },
  },
  {
    id: "media-quality", title: "Qualité des médias", order: 160,
    evaluate: (context) => {
      const quality = context.mediaQuality
      if (!quality) return result("NOT_APPLICABLE", "Aucun rapport qualité n’est disponible.", null, null)
      if (quality.deterministic.blockers.length) return result("BLOCKER", quality.summary, "Corriger les médias", vehicleHref(context, "#vehicle-photos"))
      if (quality.deterministic.warnings.length) return result("WARNING", quality.summary, "Vérifier les médias", vehicleHref(context, "#vehicle-photos"))
      return result("PASS", `Qualité média validée (${quality.score}/100).`, null, null)
    },
  },
  {
    id: "interior-tour", title: "Visite intérieure", order: 170,
    evaluate: (context) => {
      const visit = context.interiorTour
      if (!visit || visit.state === "NOT_APPLICABLE") return result("NOT_APPLICABLE", "La visite intérieure est facultative.", null, null)
      if (visit.state === "PASS") return result("PASS", visit.description, null, visit.href)
      return result("WARNING", visit.description, "Finaliser la visite intérieure", visit.href)
    },
  },
] as const

export class PublicationValidationEngine {
  validate(context: PublicationWorkspaceSource): readonly PublicationRuleResult[] {
    return rules.map((rule) => ({
      id: rule.id,
      title: rule.title,
      order: rule.order,
      ...rule.evaluate(context),
    }))
  }
}

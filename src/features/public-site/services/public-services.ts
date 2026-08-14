export const publicServiceIds = [
  "VEHICLE_SALES",
  "CONSIGNMENT",
  "RENTAL",
  "REGISTRATION",
  "ENGINE_CLEANING",
  "WORKSHOP",
  "MAINTENANCE",
  "BODYWORK",
  "TYRES",
  "DIAGNOSTIC",
  "FINANCING",
  "INSURANCE",
  "EXTENDED_WARRANTY",
] as const

export type PublicServiceId = typeof publicServiceIds[number]
export type PublicServiceIcon = "CAR" | "KEY" | "FILE" | "ENGINE" | "TOOLS" | "SHIELD"

export interface PublicServiceViewModel {
  readonly id: PublicServiceId
  readonly title: string
  readonly description: string
  readonly actionLabel: string
  readonly href: string
  readonly icon: PublicServiceIcon
}

export type GarageServiceStatus = "ENABLED" | "DISABLED"
export type GarageServiceCapability = PublicServiceId

export interface GarageServiceConfiguration {
  readonly serviceKey: PublicServiceId
  readonly status: GarageServiceStatus
  readonly publicTitle: string | null
  readonly publicDescription: string | null
  readonly publicCtaLabel: string | null
  readonly displayOrder: number
}

export interface PublicGarageServiceViewModel extends PublicServiceViewModel {
  readonly displayOrder: number
}

export interface GarageServiceSettingsViewModel {
  readonly title: string
  readonly description: string
  readonly canEdit: boolean
  readonly groups: readonly {
    readonly title: string
    readonly services: readonly GarageServiceConfiguration[]
  }[]
}

const knownIds = new Set<string>(publicServiceIds)

export function isPublicServiceId(value: unknown): value is PublicServiceId {
  return typeof value === "string" && knownIds.has(value)
}

export function resolveEnabledPublicServiceIds(
  configurations: readonly Pick<GarageServiceConfiguration, "serviceKey" | "status" | "displayOrder">[],
): readonly PublicServiceId[] {
  return [...configurations]
    .filter((item) => item.status === "ENABLED" && isPublicServiceId(item.serviceKey))
    .sort((left, right) => left.displayOrder - right.displayOrder || left.serviceKey.localeCompare(right.serviceKey))
    .map((item) => item.serviceKey)
}

const definitions: Readonly<Record<PublicServiceId, Omit<PublicServiceViewModel, "href">>> = {
  VEHICLE_SALES: { id: "VEHICLE_SALES", title: "Vente de véhicules", description: "Découvrez une sélection de véhicules préparés et disponibles.", actionLabel: "Découvrir nos véhicules", icon: "CAR" },
  CONSIGNMENT: { id: "CONSIGNMENT", title: "Dépôt-vente", description: "Confiez la présentation et la commercialisation de votre véhicule au garage.", actionLabel: "Déposer mon véhicule", icon: "KEY" },
  RENTAL: { id: "RENTAL", title: "Location", description: "Découvrez les solutions de location proposées par le garage.", actionLabel: "Découvrir la location", icon: "CAR" },
  REGISTRATION: { id: "REGISTRATION", title: "Carte grise", description: "Faites-vous accompagner dans vos démarches d’immatriculation.", actionLabel: "Demander une carte grise", icon: "FILE" },
  ENGINE_CLEANING: { id: "ENGINE_CLEANING", title: "Décalaminage moteur", description: "Prenez rendez-vous pour un nettoyage préventif du moteur.", actionLabel: "Prendre rendez-vous", icon: "ENGINE" },
  WORKSHOP: { id: "WORKSHOP", title: "Atelier", description: "Interventions mécaniques réalisées par le garage.", actionLabel: "Nous contacter", icon: "TOOLS" },
  MAINTENANCE: { id: "MAINTENANCE", title: "Entretien", description: "Entretien courant et suivi de votre véhicule.", actionLabel: "Nous contacter", icon: "TOOLS" },
  BODYWORK: { id: "BODYWORK", title: "Carrosserie", description: "Travaux de carrosserie et remise en état.", actionLabel: "Nous contacter", icon: "TOOLS" },
  TYRES: { id: "TYRES", title: "Pneumatiques", description: "Montage et remplacement de pneumatiques.", actionLabel: "Nous contacter", icon: "TOOLS" },
  DIAGNOSTIC: { id: "DIAGNOSTIC", title: "Diagnostic", description: "Diagnostic technique de votre véhicule.", actionLabel: "Nous contacter", icon: "TOOLS" },
  FINANCING: { id: "FINANCING", title: "Financement", description: "Solutions adaptées au projet automobile.", actionLabel: "Nous contacter", icon: "FILE" },
  INSURANCE: { id: "INSURANCE", title: "Assurance", description: "Accompagnement dans la recherche d’une couverture automobile.", actionLabel: "Nous contacter", icon: "SHIELD" },
  EXTENDED_WARRANTY: { id: "EXTENDED_WARRANTY", title: "Extension de garantie", description: "Protection complémentaire selon les véhicules éligibles.", actionLabel: "Nous contacter", icon: "SHIELD" },
}

export function buildEnabledPublicServices(
  basePath: string,
  configurations: readonly GarageServiceConfiguration[],
): readonly PublicGarageServiceViewModel[] {
  return [...configurations]
    .filter((item) => item.status === "ENABLED")
    .sort((left, right) => left.displayOrder - right.displayOrder || left.serviceKey.localeCompare(right.serviceKey))
    .map((configuration) => {
    const id = configuration.serviceKey
    const definition = definitions[id]
    const project = id === "REGISTRATION" ? "registration" : id === "ENGINE_CLEANING" ? "engine-cleaning" : id.toLowerCase()
    const href = id === "VEHICLE_SALES"
      ? `${basePath}/stock`
      : id === "RENTAL"
        ? `${basePath}/location`
        : id === "CONSIGNMENT"
          ? `${basePath}/depot-vente`
          : `${basePath}/contact?project=${project}`
    return {
      ...definition,
      title: configuration.publicTitle?.trim() || definition.title,
      description: configuration.publicDescription?.trim() || definition.description,
      actionLabel: configuration.publicCtaLabel?.trim() || definition.actionLabel,
      displayOrder: configuration.displayOrder,
      href,
    }
  })
}

export function getPublicServiceDefinition(id: PublicServiceId) {
  return definitions[id]
}

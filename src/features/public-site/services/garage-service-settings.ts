import { z } from "zod"

import {
  getPublicServiceDefinition,
  publicServiceIds,
  type GarageServiceConfiguration,
  type GarageServiceSettingsViewModel,
  type PublicServiceId,
} from "./public-services"

export const garageServiceConfigurationSchema = z.object({
  serviceKey: z.enum(publicServiceIds),
  status: z.enum(["ENABLED", "DISABLED"]),
  publicTitle: z.string().trim().max(120).nullable(),
  publicDescription: z.string().trim().max(500).nullable(),
  publicCtaLabel: z.string().trim().max(80).nullable(),
  displayOrder: z.number().int().min(0),
})

export const garageServiceUpdateSchema = z.object({
  services: z.array(garageServiceConfigurationSchema)
    .length(publicServiceIds.length)
    .refine((items) => new Set(items.map((item) => item.serviceKey)).size === publicServiceIds.length, {
      message: "La configuration contient des services dupliqués ou manquants.",
    }),
})

export type GarageServiceUpdateInput = z.infer<typeof garageServiceUpdateSchema>
export type GarageServiceUpdateResult =
  | { readonly success: true; readonly message: string }
  | { readonly success: false; readonly message: string }

const categories: readonly { readonly title: string; readonly ids: readonly PublicServiceId[] }[] = [
  { title: "Commerce automobile", ids: ["VEHICLE_SALES", "CONSIGNMENT", "RENTAL"] },
  { title: "Services administratifs", ids: ["REGISTRATION"] },
  { title: "Prestations", ids: ["ENGINE_CLEANING", "WORKSHOP", "MAINTENANCE", "BODYWORK", "TYRES", "DIAGNOSTIC"] },
  { title: "Services financiers", ids: ["FINANCING", "INSURANCE", "EXTENDED_WARRANTY"] },
]

export function buildGarageServiceSettingsViewModel(
  stored: readonly GarageServiceConfiguration[],
  canEdit: boolean,
): GarageServiceSettingsViewModel {
  const byId = new Map(stored.map((item) => [item.serviceKey, item]))
  const configurations = publicServiceIds.map((serviceKey, index): GarageServiceConfiguration => byId.get(serviceKey) ?? ({
    serviceKey,
    status: "DISABLED",
    publicTitle: null,
    publicDescription: null,
    publicCtaLabel: null,
    displayOrder: index,
  }))
  const configured = new Map(configurations.map((item) => [item.serviceKey, item]))
  return {
    title: "Services publics",
    description: "Choisissez les services réellement proposés sur le site public de votre garage.",
    canEdit,
    groups: categories.map((category) => ({
      title: category.title,
      services: category.ids.map((id) => configured.get(id)!),
    })),
  }
}

export function getGarageServiceLabel(id: PublicServiceId) {
  return getPublicServiceDefinition(id).title
}


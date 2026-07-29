import { z } from "zod"

import { isLiveThemeKey } from "@/features/theme/registry"

const emptyToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value

const optionalText = (maximum: number) =>
  z.preprocess(emptyToNull, z.string().trim().min(1).max(maximum).nullable().optional())

const optionalUrl = z.preprocess(
  emptyToNull,
  z.url().refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === "http:" || protocol === "https:"
  }, "L’URL doit utiliser http ou https.").transform((value) => new URL(value).toString()).nullable().optional()
)

const optionalColor = z.preprocess(
  emptyToNull,
  z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "La couleur doit utiliser le format #RRGGBB.").transform((value) => value.toUpperCase()).nullable().optional()
)

export const garageBrandingUpdateSchema = z.object({
  displayName: z.string().trim().min(1, "Le nom d’affichage est obligatoire.").max(120),
  legalName: optionalText(160),
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().regex(/^[+\d().\s-]{6,30}$/, "Le numéro de téléphone est invalide.").nullable().optional()
  ),
  email: z.preprocess(
    emptyToNull,
    z.email("L’adresse email est invalide.").transform((value) => value.toLowerCase()).nullable().optional()
  ),
  websiteUrl: optionalUrl,
  addressLine1: optionalText(160),
  addressLine2: optionalText(160),
  postalCode: optionalText(20),
  city: optionalText(100),
  countryCode: z.preprocess(
    emptyToNull,
    z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Le code pays doit contenir deux lettres.").nullable().optional()
  ),
  shortDescription: optionalText(500),
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  themeKey: z.preprocess(
    emptyToNull,
    z.string().trim().refine(isLiveThemeKey, "Le thème sélectionné n’est pas disponible.").nullable().optional()
  ),
  primaryColor: optionalColor,
  secondaryColor: optionalColor,
  accentColor: optionalColor,
})

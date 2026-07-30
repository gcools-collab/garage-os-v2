import type { GaragePublicViewModel } from "../types"
import { PublicSiteLayout } from "./PublicSiteLayout"

export function PublicLegalPage({ garage, kind }: { readonly garage: GaragePublicViewModel; readonly kind: "legal" | "privacy" }) {
  const privacy = kind === "privacy"
  return <PublicSiteLayout garage={garage}><article className="mx-auto max-w-3xl px-5 py-16 md:px-8"><h1 className="text-4xl font-semibold">{privacy ? "Politique de confidentialité" : "Mentions légales"}</h1><p className="mt-6 text-[var(--live-muted-foreground)]">{privacy ? "Cette page présente le cadre de traitement des données du site public." : `Éditeur du site : ${garage.name}.`}</p><p className="mt-4">Les informations détaillées seront complétées depuis la configuration légale du garage.</p></article></PublicSiteLayout>
}

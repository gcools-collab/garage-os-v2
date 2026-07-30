import {
  ACQUISITION_STATUS_LABELS,
  getAllowedAcquisitionTransitions,
} from "../engine/opportunity-workflow"
import type { AcquisitionOpportunity } from "../types/opportunity"
import type {
  AcquisitionDetailViewModel,
  AcquisitionListItemViewModel,
} from "../presentation/opportunity-view-model"

const PROVENANCE_LABELS = {
  LEBONCOIN: "Leboncoin",
  LA_CENTRALE: "La Centrale",
  MARKETPLACE: "Marketplace",
  CUSTOMER_TRADE_IN: "Reprise client",
  WALK_IN: "Dépôt spontané",
  PROFESSIONAL_NETWORK: "Réseau professionnel",
  DEALER: "Marchand",
  AUCTION: "Vente aux enchères",
  REFERRER: "Apporteur",
  OTHER: "Autre",
} as const

const DOCUMENT_LABELS = {
  REGISTRATION_CERTIFICATE: "Carte grise",
  TECHNICAL_INSPECTION: "Contrôle technique",
  SERVICE_BOOK: "Carnet",
  INVOICE: "Facture",
  PHOTO: "Photo",
  OTHER: "Autre pièce",
} as const

const CONFIDENCE_LABELS = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Élevée" } as const
const CONDITION_LABELS = {
  EXCELLENT: "Excellent", GOOD: "Bon", FAIR: "Moyen", POOR: "À reprendre", UNKNOWN: "Non évalué",
} as const

const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" })
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" })
const value = (input: string | number | null) =>
  input === null || input === "" ? "Non renseigné" : String(input)

function title(opportunity: AcquisitionOpportunity): string {
  return [opportunity.brand, opportunity.model, opportunity.trim].filter(Boolean).join(" ")
}

export function buildAcquisitionListItem(
  opportunity: AcquisitionOpportunity
): AcquisitionListItemViewModel {
  return {
    id: opportunity.id,
    vehicle: title(opportunity),
    seller: opportunity.seller.name,
    askingPrice: opportunity.askingPrice === null
      ? "Non renseigné"
      : currency.format(opportunity.askingPrice),
    provenance: PROVENANCE_LABELS[opportunity.provenance],
    status: ACQUISITION_STATUS_LABELS[opportunity.status],
    statusCode: opportunity.status,
    createdAt: date.format(new Date(opportunity.createdAt)),
  }
}

export function buildAcquisitionDetail(
  opportunity: AcquisitionOpportunity
): AcquisitionDetailViewModel {
  const contact = [opportunity.seller.phone, opportunity.seller.email]
    .filter(Boolean).join(" · ") || "Non renseigné"
  return {
    id: opportunity.id,
    vehicleTitle: title(opportunity),
    status: ACQUISITION_STATUS_LABELS[opportunity.status],
    statusCode: opportunity.status,
    allowedTransitions: getAllowedAcquisitionTransitions(opportunity.status)
      .map((status) => ({ value: status, label: ACQUISITION_STATUS_LABELS[status] })),
    seller: {
      type: opportunity.seller.type === "PRIVATE" ? "Particulier" : "Professionnel",
      name: opportunity.seller.name,
      contact,
      city: opportunity.seller.city ?? "Non renseignée",
    },
    acquisition: {
      askingPrice: opportunity.askingPrice === null ? "Non renseigné" : currency.format(opportunity.askingPrice),
      repairEstimate: opportunity.repairEstimate === null ? "Non renseignée" : currency.format(opportunity.repairEstimate),
      provenance: PROVENANCE_LABELS[opportunity.provenance],
      confidence: CONFIDENCE_LABELS[opportunity.confidenceLevel],
      createdAt: date.format(new Date(opportunity.createdAt)),
    },
    vehicle: [
      { label: "Immatriculation", value: value(opportunity.registration) },
      { label: "VIN", value: value(opportunity.vin) },
      { label: "Année", value: value(opportunity.year) },
      { label: "Kilométrage", value: opportunity.mileage === null ? "Non renseigné" : `${opportunity.mileage.toLocaleString("fr-FR")} km` },
      { label: "Énergie", value: value(opportunity.fuel) },
      { label: "Boîte", value: value(opportunity.gearbox) },
      { label: "Couleur", value: value(opportunity.color) },
      { label: "État général", value: CONDITION_LABELS[opportunity.generalCondition] },
      { label: "Options", value: opportunity.options.join(", ") || "Non renseignées" },
    ],
    comments: opportunity.comments ?? "Aucun commentaire.",
    documents: opportunity.documents.map((document) => ({
      id: document.id,
      category: document.category,
      categoryLabel: DOCUMENT_LABELS[document.category],
      label: document.label,
      filename: document.originalFilename,
      createdAt: date.format(new Date(document.createdAt)),
    })),
  }
}

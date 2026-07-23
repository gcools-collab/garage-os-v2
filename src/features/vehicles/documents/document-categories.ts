export const vehicleDocumentCategories = [
  "purchase_invoice", "registration_certificate", "technical_inspection",
  "maintenance_invoice", "repair_invoice", "quotation", "sales_document",
  "warranty", "administrative", "insurance", "other",
] as const

export type VehicleDocumentCategory = typeof vehicleDocumentCategories[number]

export type VehicleDocumentCategoryDefinition = {
  label: string
  description: string
  order: number
  important: boolean
}

export const vehicleDocumentCategoryDefinitions: Record<VehicleDocumentCategory, VehicleDocumentCategoryDefinition> = {
  purchase_invoice: { label: "Facture d’achat", description: "Justificatif d’acquisition du véhicule.", order: 1, important: true },
  registration_certificate: { label: "Carte grise", description: "Certificat d’immatriculation du véhicule.", order: 2, important: true },
  technical_inspection: { label: "Contrôle technique", description: "Rapport de contrôle technique.", order: 3, important: true },
  maintenance_invoice: { label: "Facture d’entretien", description: "Entretien courant et révisions.", order: 4, important: false },
  repair_invoice: { label: "Facture de réparation", description: "Travaux mécaniques ou de carrosserie.", order: 5, important: false },
  quotation: { label: "Devis", description: "Devis fournisseur ou atelier.", order: 6, important: false },
  sales_document: { label: "Document de vente", description: "Documents liés à la cession.", order: 7, important: false },
  warranty: { label: "Garantie", description: "Garantie commerciale ou constructeur.", order: 8, important: false },
  administrative: { label: "Document administratif", description: "Autre pièce administrative.", order: 9, important: false },
  insurance: { label: "Assurance", description: "Document d’assurance.", order: 10, important: false },
  other: { label: "Autre", description: "Document non classé.", order: 11, important: false },
}

export const importantVehicleDocumentCategories = vehicleDocumentCategories.filter(
  (category) => vehicleDocumentCategoryDefinitions[category].important
)

export function getVehicleDocumentCategoryDefinition(category: VehicleDocumentCategory) {
  return vehicleDocumentCategoryDefinitions[category]
}

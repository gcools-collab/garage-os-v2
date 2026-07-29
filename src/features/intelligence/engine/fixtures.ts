import type { GarageIntelligenceData } from "./garage-data"

export const garageIntelligenceFixture: GarageIntelligenceData = {
  userFirstName: "Julien",
  referenceDate: "2026-07-29T09:00:00.000Z",
  stock: [
    {
      id: "bmw-m3",
      label: "BMW M3 Competition",
      status: "PUBLISHED",
      purchasePrice: 34_000,
      sellingPrice: 42_990,
      costs: [1_200, 650],
      createdAt: "2026-05-02T10:00:00.000Z",
      hasPhotos: true,
      hasDocuments: true,
      technicalInspectionDueAt: "2026-09-12",
    },
    {
      id: "jaguar-type-e",
      label: "Jaguar Type E Série 1",
      status: "PREPARATION",
      purchasePrice: 31_500,
      sellingPrice: 42_000,
      costs: [2_400],
      createdAt: "2026-06-18T08:30:00.000Z",
      hasPhotos: true,
      hasDocuments: false,
      technicalInspectionDueAt: "2026-08-08",
    },
    {
      id: "peugeot-208",
      label: "Peugeot 208 GT",
      status: "PURCHASED",
      purchasePrice: 14_200,
      sellingPrice: null,
      costs: [],
      createdAt: "2026-07-24T14:00:00.000Z",
      hasPhotos: false,
      hasDocuments: false,
      technicalInspectionDueAt: null,
    },
  ],
  marketAnalyses: [
    { vehicleId: "bmw-m3", analyzedAt: "2026-07-26T11:00:00.000Z", position: "MARKET" },
  ],
  preparations: [
    {
      id: "prep-jaguar",
      vehicleId: "jaguar-type-e",
      label: "Finaliser la préparation esthétique",
      dueAt: "2026-07-27",
      completed: false,
    },
  ],
  sales: [
    { id: "sale-clio", vehicleId: "renault-clio", soldAt: "2026-07-18T16:00:00.000Z", sellingPrice: 19_500 },
  ],
  activities: [
    {
      id: "activity-photo",
      title: "Photos ajoutées",
      description: "BMW M3 Competition",
      occurredAt: "2026-07-29T08:15:00.000Z",
      kind: "STOCK",
    },
    {
      id: "activity-market",
      title: "Analyse marché terminée",
      description: "Positionnement cohérent pour la BMW M3 Competition",
      occurredAt: "2026-07-26T11:00:00.000Z",
      kind: "MARKET",
    },
    {
      id: "activity-sale",
      title: "Véhicule vendu",
      description: "Renault Clio RS Line",
      occurredAt: "2026-07-18T16:00:00.000Z",
      kind: "SALE",
    },
  ],
}

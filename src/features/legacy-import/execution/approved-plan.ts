import type { ApprovedResetExpectation } from "./types";

export const SAP_APPROVED_GARAGE_ID = "363f2dc0-bfd3-48d6-a1cc-96e113e96094";
export const SAP_APPROVED_MANIFEST_SHA256 = "c58a6603e8269cc49a2649640e1b4c06ab1dbccf025b8837af9f806fe4334143";
export const SAP_APPROVED_RESET: ApprovedResetExpectation = { databaseRows: 20, storageObjects: 16, storageBytes: 2_906_181 };
export const SAP_APPROVED_IMPORT_COUNTS = {
  customers: 84, customerVehicles: 0, vehicles: 18, appointments: 495, historicalPayments: 55,
  historicalPaymentAmountCents: 342_100, leads: 121, mediaUploads: 242, mediaRelations: 243,
  vehicleImages: 242, ledger: 1_016,
} as const;

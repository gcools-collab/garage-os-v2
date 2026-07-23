import assert from "node:assert/strict"
import test from "node:test"
import { importantVehicleDocumentCategories, vehicleDocumentCategories } from "./document-categories"
import { buildVehicleDocumentStoragePath, MAX_DOCUMENT_FILE_SIZE, validateDocumentFile, vehicleDocumentMetadataSchema } from "./document-validation"
import { calculateVehicleDocumentSummary } from "./vehicle-document-service"

test("valide toutes les catégories documentaires et refuse un fallback inconnu", () => {
  for (const category of vehicleDocumentCategories) assert.equal(vehicleDocumentMetadataSchema.safeParse({ category, label: "Document" }).success, true)
  assert.equal(vehicleDocumentMetadataSchema.safeParse({ category: "invoice", label: "Document" }).success, false)
})

test("accepte uniquement les couples extension et MIME autorisés", () => {
  assert.equal(validateDocumentFile({ name: "controle.pdf", type: "application/pdf", size: 100 }), null)
  assert.equal(validateDocumentFile({ name: "photo.jpeg", type: "image/jpeg", size: 100 }), null)
  assert.match(validateDocumentFile({ name: "document.exe", type: "application/pdf", size: 100 }) ?? "", /PDF/)
  assert.match(validateDocumentFile({ name: "document.pdf", type: "text/plain", size: 100 }) ?? "", /PDF/)
})

test("refuse un fichier supérieur à 10 Mo", () => {
  assert.match(validateDocumentFile({ name: "document.pdf", type: "application/pdf", size: MAX_DOCUMENT_FILE_SIZE + 1 }) ?? "", /10 Mo/)
})

test("construit un chemin Storage sans reprendre le nom brut", () => {
  assert.equal(buildVehicleDocumentStoragePath({ garageId: "garage", vehicleId: "vehicle", documentId: "document", filename: "Carte grise été (FINAL).PDF" }), "garage/vehicle/document/carte-grise-ete-final.pdf")
})

test("calcule les documents importants absents avec un dossier vide", () => {
  const summary = calculateVehicleDocumentSummary([])
  assert.equal(summary.total, 0)
  assert.deepEqual(summary.missingImportantCategories, importantVehicleDocumentCategories)
  assert.equal(summary.completenessPercentage, 0)
})

test("calcule une complétude totale lorsque les documents importants sont présents", () => {
  const summary = calculateVehicleDocumentSummary(importantVehicleDocumentCategories.map((category) => ({ category })))
  assert.deepEqual(summary.missingImportantCategories, [])
  assert.equal(summary.completenessPercentage, 100)
})

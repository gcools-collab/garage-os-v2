import assert from "node:assert/strict"
import test from "node:test"
import { calculateRegistrationProgress, canTransitionRegistrationCase } from "../engines/registration-case-engine"
import { registrationFileSchema } from "../validation/registration-validation"
const requirement = (status: "MISSING" | "UPLOADED" | "UNDER_REVIEW" | "ACCEPTED" | "REJECTED", isRequired = true) => ({ id: crypto.randomUUID(), requirementKey: "IDENTITY", label: "Identité", description: null, isRequired, displayOrder: 0, status } as const)
test("le lifecycle refuse les transitions arbitraires", () => { assert.equal(canTransitionRegistrationCase("NEW", "WAITING_FOR_DOCUMENTS"), true); assert.equal(canTransitionRegistrationCase("NEW", "COMPLETED"), false) })
test("la progression distingue transmission et vérification", () => { const value = calculateRegistrationProgress([requirement("ACCEPTED"), requirement("UPLOADED"), requirement("MISSING"), requirement("MISSING", false)]); assert.equal(value.transmittedPercent, 67); assert.equal(value.acceptedPercent, 33); assert.equal(value.isComplete, false) })
test("un dossier sans pièce obligatoire est complet", () => assert.equal(calculateRegistrationProgress([requirement("MISSING", false)]).isComplete, true))
test("les fichiers sont bornés par MIME et taille", () => { assert.equal(registrationFileSchema.safeParse({ name: "piece.pdf", size: 1024, type: "application/pdf" }).success, true); assert.equal(registrationFileSchema.safeParse({ name: "virus.exe", size: 1024, type: "application/octet-stream" }).success, false); assert.equal(registrationFileSchema.safeParse({ name: "big.pdf", size: 11 * 1024 * 1024, type: "application/pdf" }).success, false) })

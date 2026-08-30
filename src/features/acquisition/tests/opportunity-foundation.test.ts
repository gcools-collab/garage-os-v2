import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { resolve } from "node:path"
import {
  canTransitionAcquisition,
  getAllowedAcquisitionTransitions,
} from "../engine/opportunity-workflow"
import { acquisitionOpportunitySchema } from "../validation/opportunity-validation"
import { buildAcquisitionDetail, buildAcquisitionListItem } from "../builders/opportunity-builders"
import type { AcquisitionOpportunity } from "../types/opportunity"

const fixture: AcquisitionOpportunity = {
  id: "9e83ad13-9df8-4f03-8960-c89e322932a8",
  garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
  creatorUserId: "067fce5a-735a-4394-bbe6-728a5058603d",
  status: "IN_REVIEW",
  provenance: "CUSTOMER_TRADE_IN",
  confidenceLevel: "MEDIUM",
  seller: {
    id: "11121f3c-68aa-4c4b-bdd5-eb01c709db12",
    garageId: "55caf9a6-c8e2-4131-9260-4b91e2c3c006",
    type: "PRIVATE", name: "Julien Martin", phone: "0600000000",
    email: null, city: "Raismes", internalComments: null,
  },
  registration: null, vin: null, brand: "BMW", model: "M3", trim: "Competition",
  year: 2017, fuel: "Essence", gearbox: "Automatique", mileage: 63_000,
  color: "Bleu", options: ["Toit carbone"], generalCondition: "GOOD",
  askingPrice: 67_990, repairEstimate: 1_000, comments: "Proposition reçue au garage.",
  sourceUrl: null, documents: [], createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T10:00:00.000Z",
}

test("validates the deterministic acquisition workflow", () => {
  assert.equal(canTransitionAcquisition("NEW", "IN_REVIEW"), true)
  assert.equal(canTransitionAcquisition("IN_REVIEW", "PURCHASED"), false)
  assert.equal(canTransitionAcquisition("ACCEPTED", "PURCHASED"), true)
  assert.deepEqual(getAllowedAcquisitionTransitions("PURCHASED"), [])
})

test("validates opportunity business inputs", () => {
  const valid = acquisitionOpportunitySchema.safeParse({
    sellerType: "PRIVATE", sellerName: "Julien Martin", provenance: "CUSTOMER_TRADE_IN",
    confidenceLevel: "MEDIUM", brand: "BMW", model: "M3", year: 2017,
    mileage: 63_000, options: [], generalCondition: "GOOD",
    askingPrice: 67_990, repairEstimate: 1_000,
  })
  assert.equal(valid.success, true)
  assert.equal(acquisitionOpportunitySchema.safeParse({
    sellerType: "PRIVATE", sellerName: "", provenance: "OTHER",
    confidenceLevel: "MEDIUM", brand: "", model: "", year: 1800,
    mileage: -1, options: [], generalCondition: "UNKNOWN",
  }).success, false)
})

test("builds presentation-only list and detail ViewModels", () => {
  const listItem = buildAcquisitionListItem(fixture)
  const detail = buildAcquisitionDetail(fixture)
  assert.equal(listItem.vehicle, "BMW M3 Competition")
  assert.equal(listItem.status, "À étudier")
  assert.equal(detail.seller.type, "Particulier")
  assert.equal(detail.allowedTransitions.some((item) => item.value === "NEGOTIATING"), true)
  assert.equal("garageId" in listItem, false)
})

test("repository scopes every read to the active garage", () => {
  const source = readFileSync(resolve("src/features/acquisition/repositories/opportunity-repository.ts"), "utf8")
  assert.match(source, /\.eq\("garage_id", session\.garageId\)/)
  assert.match(source, /Lecture des opportunités impossible/)
})

test("server actions validate permissions and transitions", () => {
  const source = readFileSync(resolve("src/features/acquisition/actions/opportunity-actions.ts"), "utf8")
  assert.match(source, /getActiveGarageSession/)
  assert.match(source, /canTransitionAcquisition/)
  assert.match(source, /\.eq\("garage_id", resolved\.garageId\)/)
})

test("migration enforces private multi-garage RLS and document storage paths", () => {
  const sql = readFileSync(resolve("supabase/migrations/20260730000035_create_acquisition_opportunities.sql"), "utf8")
  assert.match(sql, /enable row level security/g)
  assert.match(sql, /gm\.user_id = auth\.uid\(\)/)
  assert.match(sql, /bucket_id = 'acquisition-documents'/)
  assert.match(sql, /storage\.foldername\(name\)/)
  assert.match(sql, /validate_acquisition_status_transition/)
  assert.match(sql, /revoke all on public\.acquisition_opportunities from anon/)
})

test("incremental storage policy matches the written acquisition document path", () => {
  const sql = readFileSync(resolve("supabase/migrations/20260830000059_fix_acquisition_document_storage_insert_policy.sql"), "utf8")
  const action = readFileSync(resolve("src/features/acquisition/actions/opportunity-actions.ts"), "utf8")
  assert.match(action, /`\$\{resolved\.garageId\}\/\$\{opportunity\.id\}\/\$\{crypto\.randomUUID\(\)\}\.\$\{extension\}`/)
  assert.match(sql, /array_length\(storage\.foldername\(name\), 1\) = 2/)
  assert.doesNotMatch(sql, /array_length\(storage\.foldername\(name\), 1\) = 3/)
  assert.match(sql, /ao\.garage_id::text = \(storage\.foldername\(name\)\)\[1\]/)
  assert.match(sql, /ao\.id::text = \(storage\.foldername\(name\)\)\[2\]/)
  assert.match(sql, /gm\.user_id = auth\.uid\(\)/)
  assert.match(sql, /bucket_id = 'acquisition-documents'/)
})

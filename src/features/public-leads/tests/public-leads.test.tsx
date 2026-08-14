import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildPublicRequestForm, resolvePublicRequestType } from "../builders"
import { isPublicRequestAvailable } from "../engine"
import { PublicRequestForm } from "../components"
import { validatePublicRequest } from "../validation"
import type { GarageServiceConfiguration } from "../../public-site/services"

const services: readonly GarageServiceConfiguration[] = ["VEHICLE_SALES", "CONSIGNMENT", "REGISTRATION", "ENGINE_CLEANING"].map((serviceKey, displayOrder) => ({ serviceKey, status: "ENABLED", publicTitle: null, publicDescription: null, publicCtaLabel: null, displayOrder })) as readonly GarageServiceConfiguration[]
const base = (requestType: string, extra: Record<string, unknown> = {}) => ({ garageSlug: "sap", vehicleSlug: ["VEHICLE_INQUIRY", "TEST_DRIVE"].includes(requestType) ? "bmw-m3" : "", requestType, source: "CONTACT_CENTER", firstName: "Jean", lastName: "Martin", phone: "0612345678", email: "", message: "Bonjour", preferredDate: "", preferredTime: "", consentContact: true, consentMarketing: false, website: "", formStartedAt: Date.now() - 3000, publicPageUrl: "/g/sap/contact", ...extra })

test("les parcours suivent les services actifs", () => { assert.equal(isPublicRequestAvailable("TEST_DRIVE", services), true); assert.equal(isPublicRequestAvailable("WORKSHOP", services), false); assert.equal(isPublicRequestAvailable("GENERAL_CONTACT", []), true) })
test("les sept parcours V1 sont résolus", () => { for (const project of ["buy","test-drive","trade-in","consignment","registration","engine-cleaning","other"]) assert.ok(resolvePublicRequestType(project)) })
test("achat et essai utilisent une identité véhicule serveur", () => { const sql=readFileSync("supabase/migrations/20260814000042_create_public_customer_requests.sql","utf8"); assert.match(sql,/p_request_type = 'TEST_DRIVE'/); assert.match(sql,/v\.garage_id = target_garage\.id/) })
test("valide reprise et dépôt-vente", () => { const vehicle={brand:"Peugeot",model:"308",year:"2020",mileage:"80000",desiredPrice:"15000"}; assert.equal(validatePublicRequest(base("TRADE_IN",vehicle)).success,true); assert.equal(validatePublicRequest(base("CONSIGNMENT",vehicle)).success,true) })
test("valide carte grise et décalaminage", () => { assert.equal(validatePublicRequest(base("REGISTRATION",{procedure:"CHANGE_OWNER"})).success,true); assert.equal(validatePublicRequest(base("ENGINE_CLEANING",{vehicle:"Peugeot 308",fuel:"Diesel",reason:"Perte de puissance"})).success,true) })
test("valide contact général", () => { assert.equal(validatePublicRequest(base("GENERAL_CONTACT",{subject:"Informations"})).success,true) })
test("validation et anti-spam refusent les entrées incorrectes", () => { assert.equal(validatePublicRequest(base("GENERAL_CONTACT",{subject:"Informations",website:"spam"})).success,false); assert.equal(validatePublicRequest(base("GENERAL_CONTACT",{subject:"Informations",consentContact:false})).success,false) })
test("la RPC refuse les accès invalides et limite les doublons",()=>{const sql=readFileSync("supabase/migrations/20260814000042_create_public_customer_requests.sql","utf8");for(const token of ["unavailable_garage","unavailable_vehicle","service_unavailable","duplicate_submission","rate_limited"])assert.match(sql,new RegExp(token));assert.match(sql,/g\.live_enabled/)})
test("la RPC crée tâche, notification et événements",()=>{const sql=readFileSync("supabase/migrations/20260814000042_create_public_customer_requests.sql","utf8");assert.match(sql,/insert into public\.commercial_tasks/);assert.match(sql,/insert into public\.notifications/);assert.match(sql,/TASK_CREATED/)})
test("le builder détail n'expose pas les clés JSON brutes",()=>{assert.match(readFileSync("src/features/leads/builders/lead-view-models.ts","utf8"),/requestDetailLabels/);assert.doesNotMatch(readFileSync("src/features/leads/components/LeadDetail.tsx","utf8"),/JSON\.stringify|Object\.entries/)})
test("les CTA véhicule ciblent les parcours spécialisés",()=>{const source=readFileSync("src/features/public-site/vehicle-detail/builders/vehicle-cta-section-builder.ts","utf8");assert.match(source,/project=buy/);assert.match(source,/project=test-drive/);assert.match(source,/project=trade-in/)})
test("le formulaire est accessible et expose un état d'envoi",()=>{const html=renderToStaticMarkup(<PublicRequestForm form={buildPublicRequestForm("GENERAL_CONTACT")} garageSlug="sap" vehicleSlug={null} source="CONTACT_CENTER" publicPageUrl="/g/sap/contact"/>);assert.match(html,/aria-live/);assert.match(html,/consentContact/);assert.match(html,/Transmettre ma demande/)})
test("les erreurs publiques restent humaines",()=>{const source=readFileSync("src/features/public-leads/actions/public-request-actions.ts","utf8");assert.match(source,/Nous n’avons pas pu transmettre/);assert.doesNotMatch(source,/error\.message|stacktrace/)})

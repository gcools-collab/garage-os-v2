import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildPublicOfferPresentations, resolveSelectedOfferTotal } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import { SAP_ENGINE_CLEANING_OFFER_OVERRIDES } from "@/features/service-catalog/config/sap-engine-cleaning-catalog"
import { resolveSchedulingReservationPolicy } from "@/features/scheduling/config/scheduling-policies"
import {
  ACTIVE_APPOINTMENT_STATUSES,
  filterPublicSlotsForDuration,
  INACTIVE_APPOINTMENT_STATUSES,
  isSlotAvailable,
} from "@/features/scheduling/engine/public-scheduling-engine"
import type { AppointmentTypeSetting } from "@/features/scheduling/types/scheduling"
import { buildPublicRequestForm } from "@/features/public-leads/builders/public-request-form-builder"
import { validatePublicRequest } from "@/features/public-leads/validation"

const setting = (): AppointmentTypeSetting => ({
  type: "ENGINE_CLEANING",
  onlineBookingEnabled: true,
  durationMinutes: 60,
  minimumNoticeMinutes: 0,
  bookingHorizonDays: 30,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  autoConfirm: false,
  paymentRequired: true,
  simultaneousCapacity: 2,
})

const offers = buildPublicOfferPresentations([
  {
    id: "offer-under",
    serviceKey: "ENGINE_CLEANING",
    name: "Décalaminage -2L",
    slug: "engine-cleaning-under-2l",
    description: "Pour les motorisations inférieures à 2 litres.",
    durationMinutes: 60,
    pricingType: "FIXED",
    amountCents: 3990,
    currency: "EUR",
    paymentStrategy: "FULL_PAYMENT",
    depositAmountCents: null,
  },
  {
    id: "offer-plus",
    serviceKey: "ENGINE_CLEANING",
    name: "Décalaminage +2L",
    slug: "engine-cleaning-2l-plus",
    description: "Pour les motorisations de 2 litres et plus.",
    durationMinutes: 60,
    pricingType: "FIXED",
    amountCents: 4990,
    currency: "EUR",
    paymentStrategy: "FULL_PAYMENT",
    depositAmountCents: null,
  },
])

test("decarbonization form removes plate, energy, mileage, displacement and desired date", () => {
  const fieldNames = buildPublicRequestForm("ENGINE_CLEANING").fields.map((field) => field.name)
  assert.deepEqual(fieldNames, ["vehicle", "reason", "firstName", "lastName", "phone", "email"])
  assert.equal(buildPublicRequestForm("ENGINE_CLEANING").fields.find((field) => field.name === "reason")?.required, false)
})

test("decarbonization requires vehicle, identity, phone and email", () => {
  const validation = validatePublicRequest({
    garageSlug: "sap",
    vehicleSlug: "",
    requestType: "ENGINE_CLEANING",
    source: "CONTACT_CENTER",
    firstName: "Jean",
    lastName: "Martin",
    phone: "0612345678",
    email: "client@test.com",
    message: "",
    preferredDate: "",
    preferredTime: "",
    consentContact: true,
    consentMarketing: false,
    website: "",
    formStartedAt: Date.now() - 3000,
    publicPageUrl: "/g/sap/contact",
    vehicle: "MG MGB",
  })
  assert.equal(validation.success, true)
})

test("SAP commercial rules expose concise labels, durations and shock supplements", () => {
  const under = offers.find((offer) => offer.slug === "engine-cleaning-under-2l")
  const plus = offers.find((offer) => offer.slug === "engine-cleaning-2l-plus")
  assert.ok(under)
  assert.ok(plus)
  assert.equal(under.selectLabel, "Décalaminage moteur < 2L — 39,90 €")
  assert.equal(plus.durationMinutes, SAP_ENGINE_CLEANING_OFFER_OVERRIDES["engine-cleaning-2l-plus"].durationMinutes)
  assert.equal(under.options[0]?.amountCents, 1990)
  assert.equal(plus.options[0]?.amountCents, 2990)
  assert.equal(under.options[0]?.durationDeltaMinutes, 0)
  assert.equal(
    resolveSelectedOfferTotal({ offer: under, selectedOptionIds: [under.options[0].id] }),
    5980,
  )
  assert.equal(
    resolveSelectedOfferTotal({ offer: plus, selectedOptionIds: [plus.options[0].id] }),
    7980,
  )
})

test("SAP reservation policy reserves full machine capacity as one concurrent booking", () => {
  const policy = resolveSchedulingReservationPolicy({ garageSlug: "sap", serviceKey: "ENGINE_CLEANING" })
  assert.ok(policy)
  assert.equal(policy.physicalCapacity, 2)
  assert.equal(policy.reservedUnitsPerBooking, 2)
  assert.equal(policy.effectiveConcurrentCapacity, 1)
})

test("one active decarbonization blocks another overlapping booking over the full duration window", () => {
  const policy = resolveSchedulingReservationPolicy({ garageSlug: "sap", serviceKey: "ENGINE_CLEANING" })
  const hours = [{ dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00" }]
  const appointments = [{
    startsAt: "2026-08-17T12:00:00.000Z",
    endsAt: "2026-08-17T13:30:00.000Z",
    status: "CONFIRMED" as const,
  }]
  assert.equal(isSlotAvailable({
    startsAt: "2026-08-17T12:00:00.000Z",
    durationMinutes: 60,
    timezone: "Europe/Paris",
    hours,
    exceptions: [],
    setting: setting(),
    appointments,
    policy,
    now: new Date("2026-08-16T00:00:00.000Z"),
  }), false)
  assert.equal(isSlotAvailable({
    startsAt: "2026-08-17T13:00:00.000Z",
    durationMinutes: 60,
    timezone: "Europe/Paris",
    hours,
    exceptions: [],
    setting: setting(),
    appointments,
    policy,
    now: new Date("2026-08-16T00:00:00.000Z"),
  }), false)
})

test("cancelled and historical appointments do not consume capacity", () => {
  const policy = resolveSchedulingReservationPolicy({ garageSlug: "sap", serviceKey: "ENGINE_CLEANING" })
  const hours = [{ dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00" }]
  for (const status of INACTIVE_APPOINTMENT_STATUSES) {
    assert.equal(isSlotAvailable({
      startsAt: "2026-08-17T12:00:00.000Z",
      durationMinutes: 60,
      timezone: "Europe/Paris",
      hours,
      exceptions: [],
      setting: setting(),
      appointments: [{ startsAt: "2026-08-17T12:00:00.000Z", endsAt: "2026-08-17T13:00:00.000Z", status }],
      policy,
      now: new Date("2026-08-16T00:00:00.000Z"),
    }), true)
  }
  assert.equal(isSlotAvailable({
    startsAt: "2026-08-17T12:00:00.000Z",
    durationMinutes: 60,
    timezone: "Europe/Paris",
    hours,
    exceptions: [],
    setting: setting(),
    appointments: [{
      startsAt: "2026-08-17T12:00:00.000Z",
      endsAt: "2026-08-17T13:00:00.000Z",
      status: "CONFIRMED",
      isHistorical: true,
    }],
    policy,
    now: new Date("2026-08-16T00:00:00.000Z"),
  }), true)
})

test("90-minute availability excludes starts that would overlap a later slot inside the window", () => {
  const slots = filterPublicSlotsForDuration({
    slots: [
      { startsAt: "2026-08-17T12:00:00.000Z", endsAt: "2026-08-17T13:00:00.000Z" },
      { startsAt: "2026-08-17T13:00:00.000Z", endsAt: "2026-08-17T14:00:00.000Z" },
      { startsAt: "2026-08-17T14:00:00.000Z", endsAt: "2026-08-17T15:00:00.000Z" },
    ],
    durationMinutes: 90,
    timezone: "Europe/Paris",
    hours: [{ dayOfWeek: 1, opensAt: "09:00", closesAt: "18:00" }],
    exceptions: [],
    setting: setting(),
    appointments: [],
    policy: resolveSchedulingReservationPolicy({ garageSlug: "sap", serviceKey: "ENGINE_CLEANING" }),
    now: new Date("2026-08-16T00:00:00.000Z"),
  })
  assert.deepEqual(slots.map((slot) => slot.startsAt), ["2026-08-17T14:00:00.000Z"])
})

test("active appointment states that reserve capacity are explicit", () => {
  assert.deepEqual(ACTIVE_APPOINTMENT_STATUSES, ["PENDING", "AWAITING_PAYMENT", "CONFIRMED"])
})

test("registration offer presentation keeps deposit outside the select label", () => {
  const registration = buildPublicOfferPresentations([{
    id: "reg-offer",
    serviceKey: "REGISTRATION",
    name: "Rendez-vous carte grise",
    slug: "registration-appointment",
    description: "Acompte de réservation. Le montant final dépend de la démarche.",
    durationMinutes: 30,
    pricingType: "VARIABLE",
    amountCents: null,
    currency: "EUR",
    paymentStrategy: "DEPOSIT",
    depositAmountCents: 2000,
  }])[0]
  assert.equal(registration.selectLabel, "Rendez-vous carte grise")
  assert.match(registration.depositLabel ?? "", /20,00/)
})

test("contact page loads offer-aware availability per prestation", () => {
  const source = readFileSync("src/app/(public)/g/[garageSlug]/contact/page.tsx", "utf8")
  assert.match(source, /getPublicAvailability\(contact\.garage\.slug, type, offer\.slug\)/)
  assert.match(source, /availabilityByOfferSlug/)
})

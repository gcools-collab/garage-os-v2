import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import { buildPublicRequestForm } from "@/features/public-leads/builders/public-request-form-builder"
import { PublicAppointmentSummary } from "@/features/public-leads/components/PublicAppointmentSummary"
import { PublicSlotSelector } from "@/features/scheduling/components/PublicSlotSelector"
import {
  clampWeekStart,
  groupPublicSlotsByDay,
  fullDayLabel,
  weekContainsDayIndex,
} from "@/features/scheduling/utils/public-slot-picker-utils"
import { buildPublicOfferPresentations, resolveSelectedOfferTotal } from "@/features/service-catalog/builders/public-offer-presentation-builder"
import type { AvailabilitySlot } from "@/features/scheduling/types/scheduling"

const offers = buildPublicOfferPresentations([
  {
    id: "offer-under",
    serviceKey: "ENGINE_CLEANING",
    name: "Décalaminage -2L",
    slug: "engine-cleaning-under-2l",
    description: null,
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
    description: null,
    durationMinutes: 90,
    pricingType: "FIXED",
    amountCents: 4990,
    currency: "EUR",
    paymentStrategy: "FULL_PAYMENT",
    depositAmountCents: null,
  },
])

const slotsForDays = (count: number): readonly AvailabilitySlot[] =>
  Array.from({ length: count }, (_, index) => ({
    startsAt: `2026-08-${String(index + 10).padStart(2, "0")}T10:00:00.000Z`,
    endsAt: `2026-08-${String(index + 10).padStart(2, "0")}T11:00:00.000Z`,
    dateLabel: `day-${index}`,
    timeLabel: "12:00",
  }))

test("ENGINE_CLEANING uses Votre véhicule and optional garage detail label", () => {
  const form = buildPublicRequestForm("ENGINE_CLEANING")
  assert.equal(form.steps.find((step) => step.id === "vehicle")?.title, "Votre véhicule")
  const reason = form.fields.find((field) => field.name === "reason")
  assert.equal(reason?.label, "Précision pour le garage (facultatif)")
  assert.equal(reason?.required, false)
  assert.match(reason?.placeholder ?? "", /perte de puissance/)
})

test("compact decarbonization header removes duplicate form heading", () => {
  const contactPage = readFileSync("src/features/public-site/components/PublicContactPage.tsx", "utf8")
  const requestForm = readFileSync("src/features/public-leads/components/PublicRequestForm.tsx", "utf8")
  const page = readFileSync("src/app/(public)/g/[garageSlug]/contact/page.tsx", "utf8")
  assert.match(contactPage, /projectSubtitles/)
  assert.match(contactPage, /Choisissez votre prestation et votre créneau/)
  assert.match(contactPage, /compactFormHeading/)
  assert.match(page, /compactFormHeading: selectedProject === "engine-cleaning"/)
  assert.match(requestForm, /compactFormHeading/)
  assert.match(requestForm, /!compactFormHeading/)
})

test("compact day labels and week navigation stay within available days", () => {
  const grouped = groupPublicSlotsByDay(slotsForDays(10))
  assert.equal(grouped.length, 10)
  assert.match(grouped[0]!.compactLabel, /^\S+\s+\d+$/)
  assert.match(fullDayLabel("2026-08-29T10:00:00.000Z"), /août/)
  assert.equal(clampWeekStart(10, 10), 3)
  assert.equal(weekContainsDayIndex(0, 2), true)
  assert.equal(weekContainsDayIndex(7, 2), false)
})

test("slot selector shows week navigation and full selected date above times", () => {
  const html = renderToStaticMarkup(
    <PublicSlotSelector
      slots={[
        { startsAt: "2026-08-29T12:00:00.000Z", endsAt: "2026-08-29T13:00:00.000Z", dateLabel: "legacy", timeLabel: "14:00" },
        { startsAt: "2026-08-30T12:00:00.000Z", endsAt: "2026-08-30T13:00:00.000Z", dateLabel: "legacy", timeLabel: "14:00" },
      ]}
    />,
  )
  assert.match(html, /Semaine précédente/)
  assert.match(html, /Semaine suivante/)
  assert.match(html, /Votre rendez-vous/)
  assert.doesNotMatch(html, /Choisissez votre rendez-vous/)
})

test("appointment summary reflects offer, shock, duration and total", () => {
  const under = offers[0]!
  const shockId = under.options[0]!.id
  const slot: AvailabilitySlot = {
    startsAt: "2026-08-29T12:00:00.000Z",
    endsAt: "2026-08-29T13:00:00.000Z",
    dateLabel: "day",
    timeLabel: "14:00",
  }
  const html = renderToStaticMarkup(
    <PublicAppointmentSummary slot={slot} offer={under} selectedOptionIds={[shockId]} />,
  )
  assert.match(html, /Votre rendez-vous/)
  assert.match(html, /Durée 1h/)
  assert.match(html, /Traitement choc double machine/)
  assert.match(html, /59,80/)
  assert.equal(resolveSelectedOfferTotal({ offer: under, selectedOptionIds: [shockId] }), 5980)
})

test("appointment summary hides shock line when not selected", () => {
  const under = offers[0]!
  const html = renderToStaticMarkup(
    <PublicAppointmentSummary
      slot={{ startsAt: "2026-08-29T12:00:00.000Z", endsAt: "2026-08-29T13:00:00.000Z", dateLabel: "day", timeLabel: "14:00" }}
      offer={under}
      selectedOptionIds={[]}
    />,
  )
  assert.doesNotMatch(html, /Traitement choc double machine/)
  assert.match(html, /39,90/)
})

test(">=2L summary shows 1h30 duration and 79,80 total with shock", () => {
  const plus = offers[1]!
  const shockId = plus.options[0]!.id
  const html = renderToStaticMarkup(
    <PublicAppointmentSummary
      slot={{ startsAt: "2026-08-29T12:00:00.000Z", endsAt: "2026-08-29T14:30:00.000Z", dateLabel: "day", timeLabel: "14:00" }}
      offer={plus}
      selectedOptionIds={[shockId]}
    />,
  )
  assert.match(html, /1h30/)
  assert.match(html, /79,80/)
})

test("appointment summary appears only after slot selection in form markup contract", () => {
  const source = readFileSync("src/features/public-leads/components/PublicRequestForm.tsx", "utf8")
  assert.match(source, /selectedSlot && selectedOffer/)
  assert.match(source, /PublicAppointmentSummary/)
  assert.match(source, /onSlotChange=\{setSelectedSlot\}/)
})

test("registration keeps its own form heading and procedure steps", () => {
  const form = buildPublicRequestForm("REGISTRATION")
  assert.match(form.title, /carte grise/)
  assert.equal(form.steps.find((step) => step.id === "procedure")?.title, "Votre démarche")
})

import {
  buildEmailHref,
  buildTelephoneHref,
  computeLeadPriority,
  getAvailableLeadStatuses,
} from "../engine"
import type {
  LeadDashboardSummaryViewModel,
  LeadDetailViewModel,
  LeadEventRecord,
  LeadListItemViewModel,
  LeadRecord,
  LeadSource,
  LeadStatus,
  LeadType,
} from "../types"

const leadSourceLabels: Readonly<Record<LeadSource, string>> = {
  LIVE_VEHICLE_PAGE: "Fiche véhicule publique", LIVE_HOMEPAGE: "Accueil public",
  LIVE_CATALOG: "Catalogue public", PHONE_CTA: "Appel téléphonique",
  EMAIL_CTA: "E-mail", MANUAL: "Saisie manuelle", PUBLIC_WEBSITE: "Site public",
  VEHICLE_DETAIL: "Fiche véhicule", CONTACT_CENTER: "Centre de contact",
  SERVICE_PAGE: "Page service", CONSIGNMENT_PAGE: "Page dépôt-vente",
}

export const leadStatusLabels: Readonly<Record<LeadStatus, string>> = {
  NEW: "Nouveau", TO_CONTACT: "À contacter", CONTACTED: "Contacté",
  APPOINTMENT_PLANNED: "Rendez-vous planifié", QUALIFIED: "Qualifié",
  LOST: "Perdu", WON: "Gagné", ARCHIVED: "Archivé",
}

export const leadTypeLabels: Readonly<Record<LeadType, string>> = {
  GENERAL_INQUIRY: "Demande générale", CALLBACK_REQUEST: "Demande de rappel",
  APPOINTMENT_REQUEST: "Demande de rendez-vous", TEST_DRIVE_REQUEST: "Demande d’essai",
  VEHICLE_QUESTION: "Question véhicule", PRICE_INQUIRY: "Question sur le prix",
  VEHICLE_INQUIRY: "Achat", TEST_DRIVE: "Essai", TRADE_IN: "Reprise",
  CONSIGNMENT: "Dépôt-vente", REGISTRATION: "Carte grise",
  ENGINE_CLEANING: "Décalaminage", GENERAL_CONTACT: "Contact",
  RENTAL: "Location", WORKSHOP: "Atelier", BODYWORK: "Carrosserie",
}

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" })
const dateOnly = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" })
const currency = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
const commercialEventLabels: Readonly<Record<string, string>> = {
  ASSIGNED: "Prospect pris en charge",
  NOTE_ADDED: "Note interne ajoutée",
  CALL_LOGGED: "Appel journalisé",
  EMAIL_LOGGED: "E-mail journalisé",
  FOLLOW_UP_SCHEDULED: "Relance planifiée",
  TASK_CREATED: "Action commerciale planifiée",
  TASK_COMPLETED: "Tâche commerciale terminée",
  TASK_SNOOZED: "Tâche commerciale reportée",
  APPOINTMENT_CONFIRMED: "Rendez-vous confirmé",
  LEAD_WON: "Prospect gagné",
  LEAD_LOST: "Prospect perdu",
}
const requestDetailLabels: Readonly<Record<string, string>> = {
  brand: "Marque", model: "Modèle", year: "Année", mileage: "Kilométrage",
  registration: "Immatriculation", fuel: "Énergie", gearbox: "Boîte",
  condition: "État général", desiredPrice: "Prix souhaité", procedure: "Démarche",
  vehicle: "Véhicule", engineSize: "Cylindrée", reason: "Motif", subject: "Sujet",
  contactPreference: "Préférence de contact",
}
function buildRequestDetails(metadata: Readonly<Record<string, unknown>>) {
  return Object.entries(requestDetailLabels).flatMap(([key, label]) => {
    const value = metadata[key]
    if (typeof value !== "string" && typeof value !== "number") return []
    const displayed = key === "mileage" ? `${value} km` : key === "desiredPrice" ? `${value} €` : String(value)
    return [{ label, value: displayed }]
  })
}

function toListItem(lead: LeadRecord, now = new Date()): LeadListItemViewModel {
  const priority = computeLeadPriority({
    status: lead.status,
    type: lead.type,
    createdAt: lead.created_at,
    vehicleAvailable: Boolean(lead.vehicle_id),
    now,
  })
  const preferredSlotLabel = lead.preferred_date
    ? `${dateOnly.format(new Date(`${lead.preferred_date}T00:00:00`))}${lead.preferred_time ? ` — ${lead.preferred_time}` : ""}`
    : null
  return {
    id: lead.id,
    status: lead.status,
    statusLabel: leadStatusLabels[lead.status],
    type: lead.type,
    typeLabel: leadTypeLabels[lead.type],
    createdAtLabel: dateTime.format(new Date(lead.created_at)),
    customerName: lead.customer_name,
    contactLabel: lead.customer_phone ?? lead.customer_email ?? "Non renseigné",
    vehicleTitle: lead.vehicle_title_snapshot ?? "Demande générale",
    preferredSlotLabel,
    priority,
    priorityLabel: priority === "HIGH" ? "Prioritaire" : priority === "LOW" ? "Faible" : "Normale",
    href: `/leads/${lead.id}`,
  }
}

export function buildLeadListItems(leads: readonly LeadRecord[], now = new Date()) {
  return leads.map((lead) => toListItem(lead, now))
}

export function buildLeadDetail(
  lead: LeadRecord,
  events: readonly LeadEventRecord[],
  now = new Date()
): LeadDetailViewModel {
  const base = toListItem(lead, now)
  return {
    ...base,
    phone: lead.customer_phone,
    phoneHref: buildTelephoneHref(lead.customer_phone),
    email: lead.customer_email,
    emailHref: buildEmailHref({ email: lead.customer_email }),
    message: lead.message,
    sourceLabel: leadSourceLabels[lead.source],
    consentContactLabel: lead.consent_contact ? "Contact accepté" : "Contact refusé",
    consentMarketingLabel: lead.consent_marketing ? "Offres acceptées" : "Offres refusées",
    stockHref: lead.vehicle_id ? `/stock/${lead.vehicle_id}` : null,
    publicHref: lead.public_page_url,
    priceLabel: lead.vehicle_price_snapshot_cents === null
      ? null
      : currency.format(lead.vehicle_price_snapshot_cents / 100),
    requestDetails: buildRequestDetails(lead.metadata ?? {}),
    availableStatuses: getAvailableLeadStatuses(lead.status)
      .filter((status) => status !== "WON" && status !== "LOST")
      .map((status) => ({
        value: status,
        label: leadStatusLabels[status],
      })),
    events: events.map((event) => ({
      id: event.id,
      label: event.event_type === "CREATED"
        ? "Demande créée"
        : commercialEventLabels[event.event_type]
          ?? (event.to_status
          ? `Statut : ${leadStatusLabels[event.to_status]}`
          : event.event_type),
      dateLabel: dateTime.format(new Date(event.created_at)),
    })),
  }
}

export function buildLeadDashboardSummary(
  leads: readonly { readonly status: LeadStatus; readonly type: LeadType; readonly created_at: string }[],
  now = new Date()
): LeadDashboardSummaryViewModel {
  const newCount = leads.filter((lead) => lead.status === "NEW").length
  const toContactCount = leads.filter((lead) => lead.status === "TO_CONTACT").length
  const appointmentRequestCount = leads.filter((lead) =>
    lead.type === "APPOINTMENT_REQUEST" || lead.type === "TEST_DRIVE_REQUEST"
  ).length
  const overdueCount = leads.filter((lead) =>
    ["NEW", "TO_CONTACT"].includes(lead.status) &&
    now.getTime() - Date.parse(lead.created_at) >= 86_400_000
  ).length
  const waiting = newCount + toContactCount
  const day = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris" })
  const newTodayCount = leads.filter((lead) => day.format(new Date(lead.created_at)) === day.format(now)).length
  const testDriveCount = leads.filter((lead) => lead.type === "TEST_DRIVE").length
  const tradeInCount = leads.filter((lead) => lead.type === "TRADE_IN").length
  const serviceRequestCount = leads.filter((lead) => ["REGISTRATION", "ENGINE_CLEANING", "WORKSHOP", "BODYWORK"].includes(lead.type)).length
  return {
    newCount,
    toContactCount,
    appointmentRequestCount,
    overdueCount,
    newTodayCount, testDriveCount, tradeInCount, serviceRequestCount,
    message: waiting > 0
      ? `${waiting} prospect${waiting > 1 ? "s" : ""} ${waiting > 1 ? "attendent" : "attend"} une réponse.`
      : null,
  }
}

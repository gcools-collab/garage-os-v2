import type { AppointmentRecord,AvailabilitySlot } from "../types/scheduling"
const typeLabels={TEST_DRIVE:"Essai véhicule",ENGINE_CLEANING:"Décalaminage",REGISTRATION:"Carte grise",CONSIGNMENT:"Dépôt-vente",TRADE_IN:"Reprise",WORKSHOP:"Atelier",MAINTENANCE:"Entretien",BODYWORK:"Carrosserie",DIAGNOSTIC:"Diagnostic",TYRES:"Pneumatiques",RENTAL:"Location",OTHER:"Autre"} as const
const statusLabels={PENDING:"À confirmer",AWAITING_PAYMENT:"Paiement en attente",CONFIRMED:"Confirmé",COMPLETED:"Terminé",CANCELLED:"Annulé",NO_SHOW:"Absent"} as const
const dateTime=new Intl.DateTimeFormat("fr-FR",{dateStyle:"medium",timeStyle:"short",timeZone:"Europe/Paris"})
export class AppointmentCalendarBuilder {
  build(rows: readonly AppointmentRecord[]) {
    const now = new Date().toISOString().slice(0, 10)
    return [...rows]
      .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
      .map((row) => ({
        id: row.id,
        href: row.is_historical ? null : `/appointments/${row.id}`,
        typeLabel: typeLabels[row.type],
        statusLabel: statusLabels[row.status],
        customerName: row.customer_name ?? "Contact non disponible",
        dateLabel: dateTime.format(new Date(row.starts_at)),
        timeLabel: new Date(row.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: row.timezone || "Europe/Paris" }),
        isToday: row.starts_at.slice(0, 10) === now,
        isHistorical: row.is_historical,
        customerHref: row.customer_id ? `/customers/${row.customer_id}` : null,
        status: row.status,
      }))
  }
}
export class AppointmentDetailBuilder {
  build(row: AppointmentRecord, extras?: { readonly registrationCaseId?: string | null; readonly paymentStatusLabel?: string | null }) {
    const base = new AppointmentCalendarBuilder().build([row])[0]
    return {
      ...base,
      durationMinutes: Math.round((Date.parse(row.ends_at) - Date.parse(row.starts_at)) / 60000),
      phone: row.customer_phone,
      email: row.customer_email,
      leadHref: row.lead_id ? `/leads/${row.lead_id}` : null,
      customerHref: row.customer_id ? `/customers/${row.customer_id}` : null,
      registrationHref: extras?.registrationCaseId ? `/registration/${extras.registrationCaseId}` : null,
      paymentLabel: row.payment_required ? "Paiement requis" : "Aucun prépaiement",
      paymentStatusLabel: extras?.paymentStatusLabel ?? null,
      isHistorical: row.is_historical,
      notes: typeof row.details?.notes === "string" ? row.details.notes : null,
      sourceLabel: row.is_historical ? "Historique importé" : "Garage OS",
    }
  }
}
export class PublicBookingBuilder { build(rows:readonly {readonly starts_at:string;readonly ends_at:string;readonly local_date?:string;readonly local_time?:string}[]):readonly AvailabilitySlot[]{const date=new Intl.DateTimeFormat("fr-FR",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});return rows.map(row=>({startsAt:row.starts_at,endsAt:row.ends_at,dateLabel:row.local_date?date.format(new Date(`${row.local_date}T00:00:00Z`)):row.starts_at.slice(0,10),timeLabel:row.local_time?.slice(0,5)??row.starts_at.slice(11,16)}))} }
export function buildAppointmentDashboardSummary(rows:readonly AppointmentRecord[],now=new Date()){const operational=rows.filter(row=>!row.is_historical);const today=now.toISOString().slice(0,10);return{today:operational.filter(row=>row.starts_at.slice(0,10)===today).length,upcoming:operational.filter(row=>Date.parse(row.starts_at)>now.getTime()&&!['CANCELLED','COMPLETED','NO_SHOW'].includes(row.status)).length,pending:operational.filter(row=>row.status==='PENDING').length,awaitingPayment:operational.filter(row=>row.status==='AWAITING_PAYMENT').length}}
export {typeLabels as appointmentTypeLabels,statusLabels as appointmentStatusLabels}

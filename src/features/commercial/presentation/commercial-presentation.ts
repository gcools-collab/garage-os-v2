import type {
  CommercialPriority,
  CommercialTaskStatus,
  CommercialTaskType,
  LeadLossReason,
} from "../types"

export const commercialTaskTypeLabels: Readonly<Record<CommercialTaskType, string>> = {
  CALL_PROSPECT: "Appeler le prospect",
  SEND_EMAIL: "Envoyer un e-mail",
  FOLLOW_UP: "Relancer",
  CONFIRM_APPOINTMENT: "Confirmer le rendez-vous",
  PREPARE_TEST_DRIVE: "Préparer l’essai",
  REQUEST_DOCUMENTS: "Demander des documents",
  UPDATE_LEAD: "Mettre à jour le prospect",
  OTHER: "Autre tâche",
}

export const commercialTaskStatusLabels: Readonly<Record<CommercialTaskStatus, string>> = {
  OPEN: "À faire",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminée",
  SNOOZED: "Reportée",
  CANCELLED: "Annulée",
}

export const commercialPriorityLabels: Readonly<Record<CommercialPriority, string>> = {
  URGENT: "Urgent",
  HIGH: "Haute",
  NORMAL: "Normale",
  LOW: "Faible",
}

export const leadLossReasonLabels: Readonly<Record<LeadLossReason, string>> = {
  NO_RESPONSE: "Aucune réponse",
  VEHICLE_SOLD: "Véhicule vendu",
  PRICE: "Prix",
  FINANCING: "Financement",
  VEHICLE_NOT_SUITABLE: "Véhicule inadapté",
  BOUGHT_ELSEWHERE: "Achat ailleurs",
  DUPLICATE: "Doublon",
  OTHER: "Autre",
}

const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" })
const fullFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
})

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
}

export function formatCommercialDate(value: string, now: Date) {
  const date = new Date(value)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (sameDay(date, now)) return `aujourd’hui à ${timeFormatter.format(date)}`
  if (sameDay(date, tomorrow)) return `demain à ${timeFormatter.format(date)}`
  return fullFormatter.format(date)
}

export function formatCommercialDelay(value: string, now: Date) {
  const minutes = Math.round((now.getTime() - Date.parse(value)) / 60_000)
  if (minutes <= 0) return formatCommercialDate(value, now)
  if (minutes < 60) return `en retard de ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `en retard de ${hours} h`
  return `en retard de ${Math.floor(hours / 24)} j`
}

export function formatRelativeCommercialDate(value: string, now: Date) {
  const minutes = Math.max(0, Math.floor((now.getTime() - Date.parse(value)) / 60_000))
  if (minutes < 60) return `il y a ${minutes || 1} min`
  if (minutes < 1_440) return `il y a ${Math.floor(minutes / 60)} h`
  return `il y a ${Math.floor(minutes / 1_440)} j`
}

import type { PublicRequestField, PublicRequestFormViewModel, PublicRequestType } from "../types"

const identity: readonly PublicRequestField[] = [
  { name: "firstName", label: "Prénom", type: "text", required: true },
  { name: "lastName", label: "Nom", type: "text", required: true },
  { name: "phone", label: "Téléphone", type: "tel", required: false },
  { name: "email", label: "E-mail", type: "email", required: false },
]
const vehicle = (withPrice = false): readonly PublicRequestField[] => [
  { name: "brand", label: "Marque", type: "text", required: true }, { name: "model", label: "Modèle", type: "text", required: true },
  { name: "year", label: "Année", type: "number", required: true }, { name: "mileage", label: "Kilométrage", type: "number", required: true },
  { name: "registration", label: "Immatriculation", type: "text", required: false },
  ...(withPrice ? [{ name: "desiredPrice", label: "Prix souhaité", type: "number", required: false } as const] : []),
]
const definitions: Readonly<Record<PublicRequestType, Omit<PublicRequestFormViewModel, "type">>> = {
  VEHICLE_INQUIRY: { title: "Acheter ce véhicule", description: "Posez vos questions à l’équipe du garage.", submitLabel: "Transmettre ma demande", fields: [...identity, { name: "contactPreference", label: "Préférence de contact", type: "select", required: false, options: [{ value: "PHONE", label: "Téléphone" }, { value: "EMAIL", label: "E-mail" }] }, { name: "message", label: "Message", type: "textarea", required: false }] },
  TEST_DRIVE: { title: "Demander un rendez-vous d’essai", description: "Votre demande sera confirmée par le garage. Aucun créneau n’est réservé automatiquement.", submitLabel: "Demander un essai", fields: [...identity, { name: "preferredDate", label: "Date souhaitée", type: "date", required: false }, { name: "preferredTime", label: "Moment préféré", type: "select", required: false, options: [{ value: "MORNING", label: "Matin" }, { value: "AFTERNOON", label: "Après-midi" }] }, { name: "message", label: "Message", type: "textarea", required: false }] },
  TRADE_IN: { title: "Demander une reprise", description: "Présentez votre véhicule pour être recontacté par le garage.", submitLabel: "Envoyer ma demande de reprise", fields: [...identity, ...vehicle(true), { name: "fuel", label: "Énergie", type: "text", required: false }, { name: "gearbox", label: "Boîte", type: "text", required: false }, { name: "condition", label: "État général", type: "textarea", required: false }, { name: "message", label: "Commentaire", type: "textarea", required: false }] },
  CONSIGNMENT: { title: "Déposer un véhicule", description: "Cette demande est distincte d’une reprise et prépare un futur dépôt-vente.", submitLabel: "Envoyer ma demande de dépôt-vente", fields: [...identity, ...vehicle(true), { name: "message", label: "Description", type: "textarea", required: true }] },
  REGISTRATION: { title: "Demander une carte grise", description: "Les documents nécessaires vous seront demandés lors de la prochaine étape.", submitLabel: "Transmettre ma demande", fields: [...identity, { name: "procedure", label: "Type de démarche", type: "select", required: true, options: [{ value: "CHANGE_OWNER", label: "Changement de titulaire" }, { value: "DUPLICATE", label: "Duplicata" }, { value: "ADDRESS_CHANGE", label: "Changement d’adresse" }, { value: "IMPORT", label: "Import" }, { value: "TEMPORARY_REGISTRATION", label: "Immatriculation provisoire" }, { value: "OTHER", label: "Autre" }] }, { name: "registration", label: "Immatriculation", type: "text", required: false }, { name: "message", label: "Commentaire", type: "textarea", required: false }] },
  ENGINE_CLEANING: { title: "Demander un décalaminage", description: "Décrivez le véhicule et le besoin. Aucun prix ni rendez-vous n’est confirmé à ce stade.", submitLabel: "Demander un rendez-vous", fields: [...identity, { name: "vehicle", label: "Véhicule", type: "text", required: true }, { name: "registration", label: "Immatriculation", type: "text", required: false }, { name: "fuel", label: "Énergie", type: "text", required: true }, { name: "engineSize", label: "Cylindrée", type: "text", required: false }, { name: "mileage", label: "Kilométrage", type: "number", required: false }, { name: "reason", label: "Symptôme ou raison", type: "textarea", required: true }, { name: "preferredDate", label: "Date souhaitée", type: "date", required: false }] },
  GENERAL_CONTACT: { title: "Demande générale", description: "Expliquez votre besoin à l’équipe du garage.", submitLabel: "Transmettre ma demande", fields: [...identity, { name: "subject", label: "Sujet", type: "text", required: true }, { name: "contactPreference", label: "Préférence de contact", type: "select", required: false, options: [{ value: "PHONE", label: "Téléphone" }, { value: "EMAIL", label: "E-mail" }] }, { name: "message", label: "Message", type: "textarea", required: true }] },
  RENTAL: { title: "Demande de location", description: "Le garage vous informera des possibilités disponibles.", submitLabel: "Nous contacter", fields: identity },
  WORKSHOP: { title: "Demande atelier", description: "Décrivez votre besoin.", submitLabel: "Nous contacter", fields: [...identity, { name: "subject", label: "Besoin", type: "textarea", required: false }] },
  BODYWORK: { title: "Demande carrosserie", description: "Décrivez votre besoin.", submitLabel: "Nous contacter", fields: [...identity, { name: "subject", label: "Besoin", type: "textarea", required: false }] },
}
export function buildPublicRequestForm(type: PublicRequestType): PublicRequestFormViewModel { return { type, ...definitions[type] } }
const projects: Readonly<Record<string, PublicRequestType>> = {
  buy: "VEHICLE_INQUIRY", "test-drive": "TEST_DRIVE", "trade-in": "TRADE_IN",
  consignment: "CONSIGNMENT", registration: "REGISTRATION", "engine-cleaning": "ENGINE_CLEANING",
  other: "GENERAL_CONTACT",
}
export function resolvePublicRequestType(project: string | string[] | undefined) { return typeof project === "string" ? projects[project] ?? null : null }

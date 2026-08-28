import type { PublicRequestField, PublicRequestFormViewModel, PublicRequestType } from "../types"
import { applyServiceFormConfig } from "../config/service-form-config"

const field = (step: string, value: Omit<PublicRequestField, "step">): PublicRequestField => ({ step, ...value })
const identity = (step = "contact"): readonly PublicRequestField[] => [
  field(step, { name: "firstName", label: "Prénom", type: "text", required: true }),
  field(step, { name: "lastName", label: "Nom", type: "text", required: true }),
  field(step, { name: "phone", label: "Téléphone", type: "tel", required: false }),
  field(step, { name: "email", label: "E-mail", type: "email", required: false }),
]
const vehicle = (step: string, withPrice = false): readonly PublicRequestField[] => [
  field(step, { name: "brand", label: "Marque", type: "text", required: true }),
  field(step, { name: "model", label: "Modèle", type: "text", required: true }),
  field(step, { name: "year", label: "Année", type: "number", required: true }),
  field(step, { name: "mileage", label: "Kilométrage", type: "number", required: true }),
  field(step, { name: "registration", label: "Immatriculation", type: "text", required: false }),
  ...(withPrice ? [field(step, { name: "desiredPrice", label: "Prix souhaité", type: "number", required: false })] : []),
]
const preference = field("contact", { name: "contactPreference", label: "Préférence de contact", type: "select", required: false, options: [{ value: "PHONE", label: "Téléphone" }, { value: "EMAIL", label: "E-mail" }] })
const message = (step: string, label = "Message", required = false) => field(step, { name: "message", label, type: "textarea", required })
const steps = (...values: readonly [string, string][]) => values.map(([id, title]) => ({ id, title }))

const definitions: Readonly<Record<PublicRequestType, Omit<PublicRequestFormViewModel, "type" | "contextHeading">>> = {
  VEHICLE_INQUIRY: { title: "Poser une question", description: "L’équipe du garage vous répondra au sujet de ce véhicule.", submitLabel: "Être recontacté", steps: steps(["contact", "Vos coordonnées"], ["request", "Votre question"]), fields: [...identity(), preference, message("request")] },
  TEST_DRIVE: { title: "Demander un rendez-vous d’essai", description: "Le garage vous recontactera pour confirmer le créneau. Aucun rendez-vous n’est réservé automatiquement.", submitLabel: "Demander mon essai", steps: steps(["request", "Votre disponibilité"], ["contact", "Vos coordonnées"]), fields: [field("request", { name: "preferredDate", label: "Date souhaitée", type: "date", required: false }), field("request", { name: "preferredTime", label: "Moment préféré", type: "select", required: false, options: [{ value: "MORNING", label: "Matin" }, { value: "AFTERNOON", label: "Après-midi" }] }), message("request"), ...identity()] },
  TRADE_IN: { title: "Demander une reprise", description: "Présentez le véhicule que vous souhaitez faire reprendre.", submitLabel: "Demander ma reprise", steps: steps(["vehicle", "Votre véhicule"], ["project", "Votre projet"], ["contact", "Vos coordonnées"]), fields: [...vehicle("vehicle", true), field("vehicle", { name: "fuel", label: "Énergie", type: "text", required: false }), field("vehicle", { name: "gearbox", label: "Boîte", type: "text", required: false }), field("project", { name: "condition", label: "État général", type: "textarea", required: false }), message("project", "Commentaire"), ...identity()] },
  CONSIGNMENT: { title: "Déposer un véhicule", description: "Nous étudions votre véhicule avant de vous recontacter, sans promesse d’acceptation automatique.", submitLabel: "Envoyer ma demande de dépôt-vente", steps: steps(["vehicle", "Votre véhicule"], ["project", "Votre projet"], ["contact", "Vos coordonnées"]), fields: [...vehicle("vehicle", true), message("project", "Description", true), ...identity()] },
  REGISTRATION: { title: "Préparer une demande de carte grise", description: "Vous pourrez transmettre les documents nécessaires lors de l’étape suivante du parcours.", submitLabel: "Préparer ma demande de carte grise", steps: steps(["procedure", "Votre démarche"], ["vehicle", "Votre véhicule"], ["contact", "Vos coordonnées"]), fields: [field("procedure", { name: "procedure", label: "Type de démarche", type: "select", required: true, options: [{ value: "CHANGE_OWNER", label: "Changement de titulaire" }, { value: "DUPLICATE", label: "Duplicata" }, { value: "ADDRESS_CHANGE", label: "Changement d’adresse" }, { value: "IMPORT", label: "Import" }, { value: "TEMPORARY_REGISTRATION", label: "Immatriculation provisoire" }, { value: "OTHER", label: "Autre" }] }), field("vehicle", { name: "registration", label: "Immatriculation", type: "text", required: false }), message("vehicle", "Commentaire"), ...identity()] },
  ENGINE_CLEANING: { title: "Demander un décalaminage", description: "Choisissez votre prestation et votre créneau.", submitLabel: "Demander mon rendez-vous de décalaminage", steps: steps(["vehicle", "Votre véhicule"], ["contact", "Vos coordonnées"]), fields: [field("vehicle", { name: "vehicle", label: "Marque et modèle", type: "text", required: true }), field("vehicle", { name: "reason", label: "Précision pour le garage (facultatif)", type: "textarea", required: false, placeholder: "Ex. perte de puissance, entretien préventif…" }), ...identity("contact")] },
  GENERAL_CONTACT: { title: "Comment pouvons-nous vous aider ?", description: "Expliquez votre besoin à l’équipe du garage.", submitLabel: "Être recontacté", steps: steps(["request", "Votre besoin"], ["contact", "Vos coordonnées"]), fields: [field("request", { name: "subject", label: "Sujet", type: "text", required: true }), message("request", "Message", true), ...identity(), preference] },
  RENTAL: { title: "Demande de location", description: "Le garage vous informera des possibilités disponibles.", submitLabel: "Être recontacté", steps: steps(["contact", "Vos coordonnées"]), fields: identity() },
  WORKSHOP: { title: "Demande atelier", description: "Décrivez votre besoin.", submitLabel: "Être recontacté", steps: steps(["request", "Votre besoin"], ["contact", "Vos coordonnées"]), fields: [field("request", { name: "subject", label: "Besoin", type: "textarea", required: false }), ...identity()] },
  BODYWORK: { title: "Demande carrosserie", description: "Décrivez votre besoin.", submitLabel: "Être recontacté", steps: steps(["request", "Votre besoin"], ["contact", "Vos coordonnées"]), fields: [field("request", { name: "subject", label: "Besoin", type: "textarea", required: false }), ...identity()] },
}

export function buildPublicRequestForm(type: PublicRequestType, contextHeading: string | null = null): PublicRequestFormViewModel {
  const base = definitions[type]
  return {
    type,
    contextHeading,
    ...base,
    fields: applyServiceFormConfig(type, base.fields),
  }
}
const projects: Readonly<Record<string, PublicRequestType>> = { buy: "VEHICLE_INQUIRY", "test-drive": "TEST_DRIVE", "trade-in": "TRADE_IN", consignment: "CONSIGNMENT", registration: "REGISTRATION", "engine-cleaning": "ENGINE_CLEANING", other: "GENERAL_CONTACT" }
export function resolvePublicRequestType(project: string | string[] | undefined) { return typeof project === "string" ? projects[project] ?? null : null }

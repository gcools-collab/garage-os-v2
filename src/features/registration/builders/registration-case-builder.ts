import { calculateRegistrationProgress } from "../engines"
import { registrationStatusLabels, type RegistrationCase } from "../types"
export type RegistrationCaseViewModel = Readonly<{ id: string; reference: string; title: string; customer: string; vehicle: string; status: string; createdAt: string; transmittedLabel: string; verifiedLabel: string; acceptedPercent: number }>
export function buildRegistrationCaseViewModel(item: RegistrationCase): RegistrationCaseViewModel {
  const progress = calculateRegistrationProgress(item.requirements)
  return { id: item.id, reference: item.publicReference, title: item.procedureTitle, customer: item.customerName, vehicle: [item.registrationNumber, item.brand, item.model].filter(Boolean).join(" · ") || "Véhicule non renseigné", status: registrationStatusLabels[item.status], createdAt: new Intl.DateTimeFormat("fr-FR").format(new Date(item.createdAt)), transmittedLabel: `${progress.transmittedCount}/${progress.requiredCount} documents transmis`, verifiedLabel: `${progress.acceptedCount}/${progress.requiredCount} vérifiés`, acceptedPercent: progress.acceptedPercent }
}

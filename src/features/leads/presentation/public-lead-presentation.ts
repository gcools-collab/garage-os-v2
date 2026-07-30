import type { LiveContactAction } from "@/features/public"
import { buildEmailHref, buildTelephoneHref } from "../engine"

export const PUBLIC_VEHICLE_LEAD_TYPES = [
  { value: "APPOINTMENT_REQUEST", label: "Prendre rendez-vous" },
  { value: "TEST_DRIVE_REQUEST", label: "Demander un essai" },
  { value: "CALLBACK_REQUEST", label: "Être rappelé" },
  { value: "VEHICLE_QUESTION", label: "Poser une question" },
  { value: "PRICE_INQUIRY", label: "Discuter du prix" },
] as const

export function buildVehicleLeadContactActions({
  phone,
  email,
  vehicleTitle,
  publicUrl,
}: {
  readonly phone: string | null
  readonly email: string | null
  readonly vehicleTitle: string
  readonly publicUrl: string
}): LiveContactAction[] {
  const telephoneHref = buildTelephoneHref(phone)
  const emailHref = buildEmailHref({ email, vehicleTitle, publicUrl })
  return [
    {
      id: "appointment",
      label: "Demander un rendez-vous",
      href: "#vehicle-inquiry",
      variant: "primary",
    },
    telephoneHref
      ? { id: "phone", label: "Appeler", href: telephoneHref, variant: "secondary" as const }
      : null,
    {
      id: "callback",
      label: "Être rappelé",
      href: "#vehicle-inquiry",
      variant: "secondary",
    },
    emailHref
      ? { id: "email", label: "Envoyer un e-mail", href: emailHref, variant: "secondary" as const }
      : null,
  ].filter((action): action is LiveContactAction => action !== null)
}

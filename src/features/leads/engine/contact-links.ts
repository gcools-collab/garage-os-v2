export function buildTelephoneHref(phone: string | null | undefined) {
  if (!phone) return null
  const normalized = `${phone.trim().startsWith("+") ? "+" : ""}${phone.replace(/\D/g, "")}`
  return normalized.replace("+00", "+").length >= 6 ? `tel:${normalized}` : null
}

export function buildEmailHref({
  email,
  vehicleTitle,
  publicUrl,
}: {
  readonly email: string | null | undefined
  readonly vehicleTitle?: string | null
  readonly publicUrl?: string | null
}) {
  const normalized = email?.trim().toLowerCase()
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null
  const subject = vehicleTitle
    ? `Demande concernant ${vehicleTitle}`
    : "Demande d’informations"
  const body = [
    "Bonjour,",
    "",
    vehicleTitle
      ? `Je souhaite obtenir des informations concernant ${vehicleTitle}.`
      : "Je souhaite obtenir des informations.",
    publicUrl ? `Lien : ${publicUrl}` : null,
  ].filter((line): line is string => line !== null).join("\n")
  return `mailto:${normalized}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

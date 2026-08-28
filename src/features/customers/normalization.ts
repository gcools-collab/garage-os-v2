export function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLocaleLowerCase("fr") ?? ""
  return normalized && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null
}

export function normalizeFrenchPhone(value: string | null | undefined): string | null {
  if (!value) return null
  let digits = value.replace(/[^\d+]/g, "")
  if (digits.startsWith("0033")) digits = `+33${digits.slice(4)}`
  if (digits.startsWith("0") && digits.length === 10) digits = `+33${digits.slice(1)}`
  return /^\+33\d{9}$/.test(digits) ? digits : null
}

export function formatFrenchPhone(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = normalizeFrenchPhone(value) ?? value.trim()
  if (normalized.startsWith("+33") && normalized.length === 12) {
    const local = `0${normalized.slice(3)}`
    return `${local.slice(0, 2)} ${local.slice(2, 4)} ${local.slice(4, 6)} ${local.slice(6, 8)} ${local.slice(8, 10)}`
  }
  return normalized
}

export function formatCustomerName(firstName: string | null, lastName: string | null): string {
  const parts = [firstName?.trim(), lastName?.trim()].filter(Boolean)
  return parts.length ? parts.join(" ") : "Client sans nom"
}

export function normalizeSearchQuery(value: string | undefined): string {
  return (value ?? "").replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100)
}

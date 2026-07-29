export function createBrandingInitials(displayName: string) {
  const words = displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .match(/[A-Z0-9]+/g) ?? []

  if (words.length === 0) return ""
  if (words.length === 1) return words[0][0]
  return words.slice(0, 3).map((word) => word[0]).join("")
}

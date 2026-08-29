export function isRealPhotoUrl(url: string | null | undefined) {
  const value = url?.trim() ?? ""
  return /^https?:\/\//i.test(value)
}

export function userInitials(displayName: string | null | undefined, email?: string | null) {
  const source = displayName?.trim() || email?.split("@")[0]?.trim() || ""
  if (!source) return "?"
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase()
}

import type { AvailabilitySlot } from "../types/scheduling"

export const PUBLIC_SLOT_TIMEZONE = "Europe/Paris"
export const PUBLIC_SLOT_DAYS_PER_VIEW = 7

const parisDateKey = (startsAt: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: PUBLIC_SLOT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(startsAt))

export type PublicSlotDayGroup = Readonly<{
  readonly key: string
  readonly startsAt: string
  readonly compactLabel: string
  readonly fullLabel: string
  readonly slots: readonly AvailabilitySlot[]
}>

export function compactDayLabel(startsAt: string): string {
  const date = new Date(startsAt)
  const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short", timeZone: PUBLIC_SLOT_TIMEZONE })
    .format(date)
    .replace(/\.$/, "")
  const day = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: PUBLIC_SLOT_TIMEZONE }).format(date)
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1)
  return `${capitalized} ${day}`
}

export function fullDayLabel(startsAt: string): string {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: PUBLIC_SLOT_TIMEZONE,
  }).format(new Date(startsAt))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function groupPublicSlotsByDay(slots: readonly AvailabilitySlot[]): readonly PublicSlotDayGroup[] {
  const map = new Map<string, AvailabilitySlot[]>()
  for (const slot of [...slots].sort((left, right) => left.startsAt.localeCompare(right.startsAt))) {
    const key = parisDateKey(slot.startsAt)
    const items = map.get(key) ?? []
    items.push(slot)
    map.set(key, items)
  }
  return [...map.entries()]
    .sort((left, right) => left[1][0]!.startsAt.localeCompare(right[1][0]!.startsAt))
    .map(([key, daySlots]) => ({
      key,
      startsAt: daySlots[0]!.startsAt,
      compactLabel: compactDayLabel(daySlots[0]!.startsAt),
      fullLabel: fullDayLabel(daySlots[0]!.startsAt),
      slots: daySlots,
    }))
}

export function clampWeekStart(weekStart: number, dayCount: number, daysPerView = PUBLIC_SLOT_DAYS_PER_VIEW): number {
  const maxStart = Math.max(0, dayCount - daysPerView)
  return Math.min(Math.max(0, weekStart), maxStart)
}

export function weekContainsDayIndex(weekStart: number, dayIndex: number, daysPerView = PUBLIC_SLOT_DAYS_PER_VIEW): boolean {
  return dayIndex >= weekStart && dayIndex < weekStart + daysPerView
}

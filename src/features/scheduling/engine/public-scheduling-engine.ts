import type { AppointmentStatus, AppointmentTypeSetting, BusinessHoursPeriod, CalendarException } from "../types/scheduling"
import type { SchedulingReservationPolicy } from "../config/scheduling-policies"

export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
]

export const INACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
]

export type PublicSchedulingAppointment = Readonly<{
  readonly startsAt: string
  readonly endsAt: string
  readonly status: AppointmentStatus
  readonly isHistorical?: boolean
}>

function overlaps(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
  bufferBeforeMs: number,
  bufferAfterMs: number,
) {
  return startA < endB + bufferAfterMs && endA > startB - bufferBeforeMs
}

export function countActiveOverlappingAppointments(input: {
  readonly candidateStart: number
  readonly candidateEnd: number
  readonly appointments: readonly PublicSchedulingAppointment[]
  readonly setting: Pick<AppointmentTypeSetting, "bufferBeforeMinutes" | "bufferAfterMinutes">
}): number {
  const bufferBefore = input.setting.bufferBeforeMinutes * 60_000
  const bufferAfter = input.setting.bufferAfterMinutes * 60_000
  return input.appointments.filter((appointment) => {
    if (appointment.isHistorical) return false
    if (!ACTIVE_APPOINTMENT_STATUSES.includes(appointment.status)) return false
    const start = Date.parse(appointment.startsAt)
    const end = Date.parse(appointment.endsAt)
    return overlaps(input.candidateStart, input.candidateEnd, start, end, bufferBefore, bufferAfter)
  }).length
}

export function isSlotAvailable(input: {
  readonly startsAt: string
  readonly durationMinutes: number
  readonly timezone: string
  readonly hours: readonly BusinessHoursPeriod[]
  readonly exceptions: readonly CalendarException[]
  readonly setting: AppointmentTypeSetting
  readonly appointments: readonly PublicSchedulingAppointment[]
  readonly policy: SchedulingReservationPolicy | null
  readonly now: Date
}): boolean {
  const start = Date.parse(input.startsAt)
  const end = start + input.durationMinutes * 60_000
  const notice = input.now.getTime() + input.setting.minimumNoticeMinutes * 60_000
  const horizon = input.now.getTime() + input.setting.bookingHorizonDays * 86_400_000
  if (start < notice || start > horizon) return false

  const local = new Date(input.startsAt)
  const day = local.getUTCDay()
  const period = input.hours.find((item) => item.dayOfWeek === day)
  if (!period) return false

  const [openH, openM] = period.opensAt.split(":").map(Number)
  const [closeH, closeM] = period.closesAt.split(":").map(Number)
  const dayStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), openH, openM)
  const dayEnd = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), closeH, closeM)
  if (start < dayStart || end > dayEnd) return false

  const blocked = input.exceptions.some(
    (item) => item.kind !== "OPEN" && Date.parse(item.startsAt) < end && Date.parse(item.endsAt) > start,
  )
  if (blocked) return false

  const capacity = input.policy?.effectiveConcurrentCapacity ?? input.setting.simultaneousCapacity
  const concurrent = countActiveOverlappingAppointments({
    candidateStart: start,
    candidateEnd: end,
    appointments: input.appointments,
    setting: input.setting,
  })
  return concurrent < capacity
}

export function filterPublicSlotsForDuration(input: {
  readonly slots: readonly { readonly startsAt: string; readonly endsAt: string }[]
  readonly durationMinutes: number
  readonly timezone: string
  readonly hours: readonly BusinessHoursPeriod[]
  readonly exceptions: readonly CalendarException[]
  readonly setting: AppointmentTypeSetting
  readonly appointments: readonly PublicSchedulingAppointment[]
  readonly policy: SchedulingReservationPolicy | null
  readonly now: Date
}): readonly { readonly startsAt: string; readonly endsAt: string }[] {
  const seen = new Set<string>()
  return input.slots
    .filter((slot) => {
      if (seen.has(slot.startsAt)) return false
      seen.add(slot.startsAt)
      return isSlotAvailable({
        startsAt: slot.startsAt,
        durationMinutes: input.durationMinutes,
        timezone: input.timezone,
        hours: input.hours,
        exceptions: input.exceptions,
        setting: input.setting,
        appointments: input.appointments,
        policy: input.policy,
        now: input.now,
      })
    })
    .map((slot) => ({
      startsAt: slot.startsAt,
      endsAt: new Date(Date.parse(slot.startsAt) + input.durationMinutes * 60_000).toISOString(),
    }))
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))
    .filter((slot, _, all) => {
      const start = Date.parse(slot.startsAt)
      const end = start + input.durationMinutes * 60_000
      return !all.some((other) => {
        if (other.startsAt === slot.startsAt) return false
        const otherStart = Date.parse(other.startsAt)
        return otherStart > start && otherStart < end
      })
    })
}

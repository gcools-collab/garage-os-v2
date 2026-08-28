"use client"

import { useMemo, useState } from "react"
import type { AvailabilitySlot } from "../types/scheduling"
import {
  PUBLIC_SLOT_DAYS_PER_VIEW,
  clampWeekStart,
  groupPublicSlotsByDay,
  weekContainsDayIndex,
} from "../utils/public-slot-picker-utils"

export function PublicSlotSelector({
  slots,
  legend = "Votre rendez-vous",
  onSlotChange,
}: {
  readonly slots: readonly AvailabilitySlot[]
  readonly legend?: string
  readonly onSlotChange?: (slot: AvailabilitySlot | null) => void
}) {
  const days = useMemo(() => groupPublicSlotsByDay(slots), [slots])
  const [weekStart, setWeekStart] = useState(0)
  const [selectedDayKey, setSelectedDayKey] = useState("")
  const [selectedStartsAt, setSelectedStartsAt] = useState<string | null>(null)

  const resolvedDayKey = days.some((day) => day.key === selectedDayKey)
    ? selectedDayKey
    : (days[0]?.key ?? "")
  const selectedIndex = days.findIndex((day) => day.key === resolvedDayKey)
  const resolvedWeekStart = weekContainsDayIndex(weekStart, selectedIndex)
    ? weekStart
    : clampWeekStart(Math.max(selectedIndex, 0), days.length)

  const visibleDays = days.slice(resolvedWeekStart, resolvedWeekStart + PUBLIC_SLOT_DAYS_PER_VIEW)
  const selectedDay = days.find((day) => day.key === resolvedDayKey) ?? visibleDays[0] ?? null
  const canGoPrev = resolvedWeekStart > 0
  const canGoNext = resolvedWeekStart + PUBLIC_SLOT_DAYS_PER_VIEW < days.length

  const shiftWeek = (delta: number) => {
    const nextStart = clampWeekStart(resolvedWeekStart + delta, days.length)
    setWeekStart(nextStart)
    if (!weekContainsDayIndex(nextStart, selectedIndex)) {
      const nextDay = days[nextStart]
      if (nextDay) {
        setSelectedDayKey(nextDay.key)
        setSelectedStartsAt(null)
        onSlotChange?.(null)
      }
    }
  }

  if (!slots.length) {
    return (
      <p className="rounded-lg border p-4 text-sm text-[var(--live-muted-foreground)]">
        Aucun créneau en ligne n’est actuellement disponible. Vous pouvez transmettre votre demande sans rendez-vous.
      </p>
    )
  }

  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-4 text-lg font-semibold">{legend}</legend>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Semaine précédente"
            disabled={!canGoPrev}
            onClick={() => shiftWeek(-PUBLIC_SLOT_DAYS_PER_VIEW)}
            className="min-h-11 rounded-lg border border-[var(--live-border)] px-3 text-sm disabled:opacity-40"
          >
            ←
          </button>
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
            {visibleDays.map((day) => (
              <button
                key={day.key}
                type="button"
                aria-pressed={selectedDay?.key === day.key}
                onClick={() => {
                  setSelectedDayKey(day.key)
                  setSelectedStartsAt(null)
                  onSlotChange?.(null)
                }}
                className={`min-h-11 shrink-0 rounded-lg border px-3 text-sm ${selectedDay?.key === day.key ? "border-[var(--live-primary)] bg-[var(--live-primary)] text-[var(--live-primary-foreground)]" : "border-[var(--live-border)]"}`}
              >
                {day.compactLabel}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Semaine suivante"
            disabled={!canGoNext}
            onClick={() => shiftWeek(PUBLIC_SLOT_DAYS_PER_VIEW)}
            className="min-h-11 rounded-lg border border-[var(--live-border)] px-3 text-sm disabled:opacity-40"
          >
            →
          </button>
        </div>
        {selectedDay ? (
          <div>
            <p className="mb-2 text-sm font-medium">{selectedDay.fullLabel}</p>
            <div className="flex flex-wrap gap-2">
              {selectedDay.slots.map((item) => (
                <label key={item.startsAt} className="cursor-pointer">
                  <input
                    className="peer sr-only"
                    type="radio"
                    name="appointmentStartsAt"
                    value={item.startsAt}
                    checked={selectedStartsAt === item.startsAt}
                    required={selectedDay.slots[0]?.startsAt === item.startsAt}
                    onChange={() => {
                      setSelectedStartsAt(item.startsAt)
                      onSlotChange?.(item)
                    }}
                  />
                  <span className="flex min-h-11 min-w-20 items-center justify-center rounded-lg border px-4 peer-checked:border-[var(--live-primary)] peer-checked:bg-[var(--live-primary)] peer-checked:text-[var(--live-primary-foreground)] peer-focus-visible:outline-2">
                    {item.timeLabel}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </fieldset>
  )
}

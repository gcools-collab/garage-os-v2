"use client"

import { useMemo, useState } from "react"
import type { AvailabilitySlot } from "../types/scheduling"

export function PublicSlotSelector({ slots }: { readonly slots: readonly AvailabilitySlot[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, AvailabilitySlot[]>()
    for (const slot of slots) {
      const items = map.get(slot.dateLabel) ?? []
      items.push(slot)
      map.set(slot.dateLabel, items)
    }
    return [...map.entries()]
      .map(([dateLabel, items]) => [dateLabel, [...items].sort((a, b) => a.startsAt.localeCompare(b.startsAt))] as const)
      .sort((left, right) => left[1][0]?.startsAt.localeCompare(right[1][0]?.startsAt ?? "") ?? 0)
  }, [slots])

  const [selectedDay, setSelectedDay] = useState(grouped[0]?.[0] ?? "")
  const daySlots = grouped.find(([day]) => day === selectedDay)?.[1] ?? []

  if (!slots.length) {
    return (
      <p className="rounded-lg border p-4 text-sm text-[var(--live-muted-foreground)]">
        Aucun créneau en ligne n’est actuellement disponible. Vous pouvez transmettre votre demande sans rendez-vous.
      </p>
    )
  }

  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-4 text-lg font-semibold">Choisissez votre rendez-vous</legend>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {grouped.map(([day]) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`min-h-11 rounded-lg border px-4 text-sm capitalize ${selectedDay === day ? "border-[var(--live-primary)] bg-[var(--live-primary)] text-[var(--live-primary-foreground)]" : "border-[var(--live-border)]"}`}
            >
              {day}
            </button>
          ))}
        </div>
        {selectedDay ? (
          <div>
            <p className="mb-2 text-sm text-[var(--live-muted-foreground)] capitalize">{selectedDay}</p>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((item) => (
                <label key={item.startsAt} className="cursor-pointer">
                  <input className="peer sr-only" type="radio" name="appointmentStartsAt" value={item.startsAt} required />
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

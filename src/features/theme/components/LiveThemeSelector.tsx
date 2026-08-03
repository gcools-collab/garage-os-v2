"use client"

import { useState } from "react"

import type { LiveThemeDefinition } from "../types"
import { LiveThemePreview } from "./LiveThemePreview"

export function LiveThemeSelector({
  themes,
  selectedThemeKey,
  disabled,
}: {
  readonly themes: readonly LiveThemeDefinition[]
  readonly selectedThemeKey: string
  readonly disabled: boolean
}) {
  const [currentThemeKey, setCurrentThemeKey] = useState(selectedThemeKey)

  return (
    <fieldset disabled={disabled}>
      <legend className="text-base font-medium">Thème du site public</legend>
      <p className="mt-1 text-sm text-muted-foreground">
        Choisissez une identité visuelle contrôlée pour Garage OS Live.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {themes.map((theme) => {
          const selected = theme.key === currentThemeKey
          return (
            <label key={theme.key} className="cursor-pointer rounded-xl border bg-card p-3 has-checked:ring-2 has-checked:ring-primary has-disabled:cursor-not-allowed has-disabled:opacity-60">
              <input
                checked={selected}
                className="sr-only"
                type="radio"
                name="themeKey"
                value={theme.key}
                onChange={() => setCurrentThemeKey(theme.key)}
              />
              <LiveThemePreview theme={theme} />
              <span className="mt-3 flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium">{theme.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{theme.description}</span>
                </span>
                <span className="shrink-0 text-xs font-medium">{selected ? "Sélectionné" : "Choisir"}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

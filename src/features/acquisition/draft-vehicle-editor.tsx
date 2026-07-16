"use client"

import { Input } from "@/components/ui/input"
import { editableDraftVehicleSchema } from "./schema"
import type { DraftVehicle, DraftVehicleCharacteristics } from "./types"

type DraftVehicleEditorProps = {
  draft: DraftVehicle
  onChange: (draft: DraftVehicle) => void
}

type TextField = "brand" | "model" | "trim"
type CharacteristicTextField =
  | "fuel"
  | "gearbox"
  | "color"
  | "firstRegistrationDate"
  | "bodyType"
  | "upholstery"
type CharacteristicNumberField =
  | "powerDin"
  | "fiscalPower"
  | "doors"
  | "seats"

function nullableNumber(value: string) {
  if (value === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function DraftVehicleEditor({ draft, onChange }: DraftVehicleEditorProps) {
  const validation = editableDraftVehicleSchema.safeParse(draft)
  const issues = validation.success ? [] : validation.error.issues
  const errorFor = (...path: Array<string | number>) =>
    issues.find((issue) => issue.path.join(".") === path.join("."))?.message

  const updateText = (field: TextField, value: string) => {
    onChange({ ...draft, [field]: field === "trim" ? value || null : value })
  }
  const updateCharacteristic = <Key extends keyof DraftVehicleCharacteristics>(
    field: Key,
    value: DraftVehicleCharacteristics[Key]
  ) => {
    onChange({
      ...draft,
      characteristics: { ...draft.characteristics, [field]: value },
    })
  }

  const fields: Array<{
    label: string
    field: TextField
    required?: boolean
  }> = [
    { label: "Marque", field: "brand", required: true },
    { label: "Modèle", field: "model", required: true },
    { label: "Finition / version", field: "trim" },
  ]
  const characteristicTexts: Array<{
    label: string
    field: CharacteristicTextField
    type?: "date"
  }> = [
    { label: "Carburant", field: "fuel" },
    { label: "Boîte de vitesses", field: "gearbox" },
    { label: "Couleur", field: "color" },
    {
      label: "Première mise en circulation",
      field: "firstRegistrationDate",
      type: "date",
    },
    { label: "Type de carrosserie", field: "bodyType" },
    { label: "Sellerie", field: "upholstery" },
  ]
  const characteristicNumbers: Array<{
    label: string
    field: CharacteristicNumberField
    min: number
    max: number
  }> = [
    { label: "Puissance DIN (ch)", field: "powerDin", min: 0, max: 3000 },
    { label: "Puissance fiscale (CV)", field: "fiscalPower", min: 0, max: 1000 },
    { label: "Portes", field: "doors", min: 2, max: 6 },
    { label: "Places", field: "seats", min: 1, max: 9 },
  ]

  return (
    <div className="rounded-xl border bg-muted/20 p-4 sm:p-5">
      <div className="mb-5">
        <h3 className="font-semibold">Vérifier les informations importées</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Corrige les données si nécessaire. L’annonce source ne sera pas modifiée.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fields.map(({ label, field, required }) => {
          const error = errorFor(field)
          return (
            <div key={field} className="space-y-2">
              <label htmlFor={`draft-${field}`} className="text-sm font-medium">
                {label}
              </label>
              <Input
                id={`draft-${field}`}
                value={draft[field] ?? ""}
                required={required}
                aria-invalid={Boolean(error)}
                onChange={(event) => updateText(field, event.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )
        })}

        <div className="space-y-2">
          <label htmlFor="draft-year" className="text-sm font-medium">Année</label>
          <Input
            id="draft-year"
            type="number"
            min={1886}
            max={new Date().getFullYear() + 1}
            value={draft.year ?? ""}
            aria-invalid={Boolean(errorFor("year"))}
            onChange={(event) => onChange({ ...draft, year: nullableNumber(event.target.value) })}
          />
          {errorFor("year") && <p className="text-sm text-destructive">{errorFor("year")}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="draft-mileage" className="text-sm font-medium">Kilométrage</label>
          <Input
            id="draft-mileage"
            type="number"
            min={0}
            value={draft.mileage ?? ""}
            aria-invalid={Boolean(errorFor("mileage"))}
            onChange={(event) => onChange({ ...draft, mileage: nullableNumber(event.target.value) })}
          />
          {errorFor("mileage") && <p className="text-sm text-destructive">{errorFor("mileage")}</p>}
        </div>

        {characteristicTexts.map(({ label, field, type }) => {
          const error = errorFor("characteristics", field)
          return (
            <div key={field} className="space-y-2">
              <label htmlFor={`draft-${field}`} className="text-sm font-medium">{label}</label>
              <Input
                id={`draft-${field}`}
                type={type}
                value={String(draft.characteristics[field] ?? "")}
                aria-invalid={Boolean(error)}
                onChange={(event) => updateCharacteristic(field, event.target.value || null)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )
        })}

        {characteristicNumbers.map(({ label, field, min, max }) => {
          const error = errorFor("characteristics", field)
          return (
            <div key={field} className="space-y-2">
              <label htmlFor={`draft-${field}`} className="text-sm font-medium">{label}</label>
              <Input
                id={`draft-${field}`}
                type="number"
                min={min}
                max={max}
                value={draft.characteristics[field] ?? ""}
                aria-invalid={Boolean(error)}
                onChange={(event) => updateCharacteristic(field, nullableNumber(event.target.value))}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

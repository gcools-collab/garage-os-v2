"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createVehicleCost, updateVehicleCost } from "../cost-actions"
import {
  vehicleCostCategories,
  vehicleCostCategoryLabels,
  type VehicleCostCategory,
} from "../cost-schema"
import { initialVehicleCostActionState } from "../cost-state"

export type EditableVehicleCost = {
  id: string
  type: VehicleCostCategory
  label: string
  amount: number | string
  incurred_at: string
  notes: string | null
}

export function VehicleCostForm({
  vehicleId,
  cost,
}: {
  vehicleId: string
  cost?: EditableVehicleCost
}) {
  const action = cost
    ? updateVehicleCost.bind(null, cost.id, vehicleId)
    : createVehicleCost.bind(null, vehicleId)
  const [state, formAction, pending] = useActionState(
    action,
    initialVehicleCostActionState
  )
  const today = new Date().toISOString().slice(0, 10)

  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`cost-type-${cost?.id ?? "new"}`} className="text-sm font-medium">
            Catégorie
          </label>
          <select
            id={`cost-type-${cost?.id ?? "new"}`}
            name="type"
            defaultValue={cost?.type ?? "MECHANIC"}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {vehicleCostCategories.map((category) => (
              <option key={category} value={category}>
                {vehicleCostCategoryLabels[category]}
              </option>
            ))}
          </select>
          {state.errors?.type?.[0] && (
            <p className="text-sm text-destructive">{state.errors.type[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor={`cost-date-${cost?.id ?? "new"}`} className="text-sm font-medium">
            Date
          </label>
          <Input
            id={`cost-date-${cost?.id ?? "new"}`}
            name="incurredAt"
            type="date"
            max={today}
            defaultValue={cost?.incurred_at ?? today}
            required
          />
          {state.errors?.incurredAt?.[0] && (
            <p className="text-sm text-destructive">{state.errors.incurredAt[0]}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor={`cost-label-${cost?.id ?? "new"}`} className="text-sm font-medium">
            Libellé
          </label>
          <Input
            id={`cost-label-${cost?.id ?? "new"}`}
            name="label"
            defaultValue={cost?.label ?? ""}
            placeholder="Ex. Réparation freinage"
            required
          />
          {state.errors?.label?.[0] && (
            <p className="text-sm text-destructive">{state.errors.label[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor={`cost-amount-${cost?.id ?? "new"}`} className="text-sm font-medium">
            Montant (€)
          </label>
          <Input
            id={`cost-amount-${cost?.id ?? "new"}`}
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            defaultValue={cost?.amount ?? ""}
            required
          />
          {state.errors?.amount?.[0] && (
            <p className="text-sm text-destructive">{state.errors.amount[0]}</p>
          )}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label htmlFor={`cost-notes-${cost?.id ?? "new"}`} className="text-sm font-medium">
            Notes facultatives
          </label>
          <textarea
            id={`cost-notes-${cost?.id ?? "new"}`}
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={cost?.notes ?? ""}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </fieldset>

      {state.message && (
        <p className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"} role="status">
          {state.message}
          {state.warning ? ` ${state.warning}` : ""}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Enregistrement..." : cost ? "Enregistrer le coût" : "Ajouter le coût"}
      </Button>
    </form>
  )
}

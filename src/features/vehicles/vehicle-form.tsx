"use client"

import {
  cloneElement,
  useActionState,
  useId,
  type ComponentProps,
  type ReactElement,
} from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createVehicle, updateVehicle } from "./actions"
import {
  initialVehicleActionState,
  type VehicleActionState,
} from "./schema"

export type VehicleFormVehicle = {
  id: string
  brand: string
  model: string
  year: number | null
  mileage: number | null
  purchase_price: number | string | null
  selling_price: number | string | null
  vin: string | null
  registration_number: string | null
  color: string | null
  doors: number | null
  seats: number | null
  power_din: number | null
  fiscal_power: number | null
  co2_emissions: number | null
  crit_air: number | null
  euro_standard: string | null
  trim: string | null
  engine: string | null
  fuel: string | null
  gearbox: string | null
  transmission: string | null
  owners_count: number | null
  first_registration_date: string | null
}

type VehicleFormProps =
  | { mode?: "create"; vehicle?: never }
  | { mode: "edit"; vehicle: VehicleFormVehicle }

type FieldProps = {
  label: string
  name: string
  errors?: VehicleActionState["errors"]
  children: ReactElement<ComponentProps<typeof Input>>
}

function Field({ label, name, errors, children }: FieldProps) {
  const id = useId()
  const error = errors?.[name]?.[0]

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function VehicleForm({ mode = "create", vehicle }: VehicleFormProps) {
  const action =
    mode === "edit" && vehicle
      ? updateVehicle.bind(null, vehicle.id)
      : createVehicle
  const [state, formAction, pending] = useActionState(
    action,
    initialVehicleActionState
  )
  const prefix = mode === "edit" ? "edit-vehicle" : "create-vehicle"

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={pending} className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-xl border bg-white p-5">
          <div>
            <h3 className="font-semibold">Informations essentielles</h3>
            <p className="text-sm text-muted-foreground">
              Identification commerciale et données de stock.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Marque" name="brand" errors={state.errors}>
              <Input
                id={`${prefix}-brand`}
                name="brand"
                defaultValue={vehicle?.brand ?? ""}
                required
                aria-invalid={Boolean(state.errors?.brand)}
              />
            </Field>
            <Field label="Modèle" name="model" errors={state.errors}>
              <Input
                id={`${prefix}-model`}
                name="model"
                defaultValue={vehicle?.model ?? ""}
                required
                aria-invalid={Boolean(state.errors?.model)}
              />
            </Field>
            <Field label="Finition" name="trim" errors={state.errors}>
              <Input
                id={`${prefix}-trim`}
                name="trim"
                defaultValue={vehicle?.trim ?? ""}
              />
            </Field>
            <Field label="Année" name="year" errors={state.errors}>
              <Input
                id={`${prefix}-year`}
                name="year"
                type="number"
                min={1886}
                max={new Date().getFullYear() + 1}
                defaultValue={vehicle?.year ?? ""}
                required
                aria-invalid={Boolean(state.errors?.year)}
              />
            </Field>
            <Field label="Kilométrage" name="mileage" errors={state.errors}>
              <Input
                id={`${prefix}-mileage`}
                name="mileage"
                type="number"
                min={0}
                defaultValue={vehicle?.mileage ?? ""}
                required
                aria-invalid={Boolean(state.errors?.mileage)}
              />
            </Field>
            <Field
              label="Prix d'achat (€)"
              name="purchasePrice"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-purchase-price`}
                name="purchasePrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={vehicle?.purchase_price ?? ""}
                required
                aria-invalid={Boolean(state.errors?.purchasePrice)}
              />
            </Field>
            <Field
              label="Prix de vente affiché (€)"
              name="sellingPrice"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-selling-price`}
                name="sellingPrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={vehicle?.selling_price ?? ""}
                aria-invalid={Boolean(state.errors?.sellingPrice)}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-white p-5">
          <div>
            <h3 className="font-semibold">Identification administrative</h3>
            <p className="text-sm text-muted-foreground">
              Données nécessaires au matching et à la diffusion.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="VIN" name="vin" errors={state.errors}>
              <Input
                id={`${prefix}-vin`}
                name="vin"
                maxLength={17}
                defaultValue={vehicle?.vin ?? ""}
                className="uppercase"
                aria-invalid={Boolean(state.errors?.vin)}
              />
            </Field>
            <Field
              label="Immatriculation"
              name="registrationNumber"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-registration-number`}
                name="registrationNumber"
                maxLength={20}
                defaultValue={vehicle?.registration_number ?? ""}
                className="uppercase"
                aria-invalid={Boolean(state.errors?.registrationNumber)}
              />
            </Field>
            <Field
              label="Première mise en circulation"
              name="firstRegistrationDate"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-first-registration-date`}
                name="firstRegistrationDate"
                type="date"
                defaultValue={vehicle?.first_registration_date ?? ""}
                aria-invalid={Boolean(state.errors?.firstRegistrationDate)}
              />
            </Field>
            <Field label="Couleur" name="color" errors={state.errors}>
              <Input
                id={`${prefix}-color`}
                name="color"
                defaultValue={vehicle?.color ?? ""}
              />
            </Field>
            <Field
              label="Nombre de propriétaires"
              name="ownersCount"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-owners-count`}
                name="ownersCount"
                type="number"
                min={0}
                max={99}
                defaultValue={vehicle?.owners_count ?? ""}
                aria-invalid={Boolean(state.errors?.ownersCount)}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border bg-white p-5 lg:col-span-2">
          <div>
            <h3 className="font-semibold">Caractéristiques techniques</h3>
            <p className="text-sm text-muted-foreground">
              Données utiles au Market Engine, à l’IA et aux statistiques.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Motorisation" name="engine" errors={state.errors}>
              <Input
                id={`${prefix}-engine`}
                name="engine"
                defaultValue={vehicle?.engine ?? ""}
              />
            </Field>
            <Field label="Carburant" name="fuel" errors={state.errors}>
              <Input
                id={`${prefix}-fuel`}
                name="fuel"
                defaultValue={vehicle?.fuel ?? ""}
              />
            </Field>
            <Field label="Boîte" name="gearbox" errors={state.errors}>
              <Input
                id={`${prefix}-gearbox`}
                name="gearbox"
                defaultValue={vehicle?.gearbox ?? ""}
              />
            </Field>
          </div>

          <details className="group rounded-lg border bg-muted/20">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium marker:content-none">
              Informations techniques secondaires
              <span className="ml-2 text-xs font-normal text-muted-foreground group-open:hidden">Afficher</span>
            </summary>
            <div className="grid gap-4 border-t p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Transmission"
              name="transmission"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-transmission`}
                name="transmission"
                defaultValue={vehicle?.transmission ?? ""}
              />
            </Field>
            <Field label="Portes" name="doors" errors={state.errors}>
              <Input
                id={`${prefix}-doors`}
                name="doors"
                type="number"
                min={2}
                max={6}
                defaultValue={vehicle?.doors ?? ""}
                aria-invalid={Boolean(state.errors?.doors)}
              />
            </Field>
            <Field label="Places" name="seats" errors={state.errors}>
              <Input
                id={`${prefix}-seats`}
                name="seats"
                type="number"
                min={1}
                max={9}
                defaultValue={vehicle?.seats ?? ""}
                aria-invalid={Boolean(state.errors?.seats)}
              />
            </Field>
            <Field
              label="Puissance DIN (ch)"
              name="powerDin"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-power-din`}
                name="powerDin"
                type="number"
                min={0}
                max={3000}
                defaultValue={vehicle?.power_din ?? ""}
                aria-invalid={Boolean(state.errors?.powerDin)}
              />
            </Field>
            <Field
              label="Puissance fiscale (CV)"
              name="fiscalPower"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-fiscal-power`}
                name="fiscalPower"
                type="number"
                min={0}
                max={1000}
                defaultValue={vehicle?.fiscal_power ?? ""}
                aria-invalid={Boolean(state.errors?.fiscalPower)}
              />
            </Field>
            <Field
              label="Émissions CO₂ (g/km)"
              name="co2Emissions"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-co2-emissions`}
                name="co2Emissions"
                type="number"
                min={0}
                max={1000}
                defaultValue={vehicle?.co2_emissions ?? ""}
                aria-invalid={Boolean(state.errors?.co2Emissions)}
              />
            </Field>
            <Field label="Crit’Air" name="critAir" errors={state.errors}>
              <Input
                id={`${prefix}-crit-air`}
                name="critAir"
                type="number"
                min={0}
                max={5}
                defaultValue={vehicle?.crit_air ?? ""}
                aria-invalid={Boolean(state.errors?.critAir)}
              />
            </Field>
            <Field
              label="Norme Euro"
              name="euroStandard"
              errors={state.errors}
            >
              <Input
                id={`${prefix}-euro-standard`}
                name="euroStandard"
                placeholder="Euro 6d"
                defaultValue={vehicle?.euro_standard ?? ""}
              />
            </Field>
            </div>
          </details>
        </div>
      </fieldset>

      {state.message && (
        <p
          className={state.success ? "text-sm text-emerald-600" : "text-sm text-destructive"}
          role="status"
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending
          ? "Enregistrement..."
          : mode === "edit"
            ? "Enregistrer les modifications"
            : "Ajouter le véhicule"}
      </Button>
    </form>
  )
}

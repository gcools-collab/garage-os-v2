"use client"

import { useActionState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createAcquiredVehicle,
  previewAcquiredVehicle,
} from "./actions"
import { initialAcquisitionState } from "./state"
import type { DraftVehicle } from "./types"

type GarageOption = {
  id: string
  name: string
}

function DraftPreview({ draft }: { draft: DraftVehicle }) {
  const entries = Object.entries(draft.characteristics).filter(
    ([, value]) => value !== null && value !== ""
  )

  return (
    <Card>
      {draft.photos[0] && (
        <div
          role="img"
          aria-label={`${draft.brand} ${draft.model}`}
          className="aspect-[16/7] rounded-t-xl bg-zinc-100 bg-cover bg-center"
          style={{ backgroundImage: `url(${JSON.stringify(draft.photos[0])})` }}
        />
      )}
      <CardHeader>
        <CardTitle>
          {draft.brand} {draft.model} {draft.trim}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {[draft.year, draft.mileage !== null ? `${draft.mileage} km` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {draft.advertisedPrice !== null && (
          <p className="text-2xl font-semibold">
            {draft.advertisedPrice.toLocaleString("fr-FR")} € affichés
          </p>
        )}
        {entries.length > 0 && (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map(([name, value]) => (
              <div key={name} className="rounded-lg border p-3">
                <dt className="text-xs uppercase text-muted-foreground">{name}</dt>
                <dd className="mt-1 font-medium">{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        {draft.description && (
          <div>
            <h3 className="mb-2 font-semibold">Description</h3>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {draft.description}
            </p>
          </div>
        )}
        {draft.photos.length > 1 && (
          <p className="text-sm text-muted-foreground">
            {draft.photos.length} photos seront importées.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function CreateVehicleForm({
  draft,
  garages,
}: {
  draft: DraftVehicle
  garages: GarageOption[]
}) {
  const action = createAcquiredVehicle.bind(null, draft)
  const [state, formAction, pending] = useActionState(
    action,
    initialAcquisitionState
  )

  if (state.success && state.vehicleId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-4 pt-6">
          <p className="text-sm text-emerald-700">{state.message}</p>
          <Button asChild>
            <Link href={`/stock/${state.vehicleId}`}>Voir la fiche</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compléments métier</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="garageId" className="text-sm font-medium">
                Garage
              </label>
              <Select name="garageId" defaultValue={garages[0]?.id} required>
                <SelectTrigger id="garageId" className="w-full">
                  <SelectValue placeholder="Sélectionner un garage" />
                </SelectTrigger>
                <SelectContent>
                  {garages.map((garage) => (
                    <SelectItem key={garage.id} value={garage.id}>
                      {garage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {state.errors?.garageId?.[0] && (
                <p className="text-sm text-destructive">{state.errors.garageId[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <label htmlFor="purchasePrice" className="text-sm font-medium">
                Prix d&apos;achat (€)
              </label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                min={0}
                step="0.01"
                defaultValue={draft.advertisedPrice ?? ""}
                required
              />
              {state.errors?.purchasePrice?.[0] && (
                <p className="text-sm text-destructive">
                  {state.errors.purchasePrice[0]}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes internes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              maxLength={5000}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            {state.errors?.notes?.[0] && (
              <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
            )}
          </div>
          {state.message && (
            <p className="text-sm text-destructive" role="status">
              {state.message}
            </p>
          )}
          <Button type="submit" disabled={pending || garages.length === 0}>
            {pending ? "Création..." : "Créer le véhicule"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export function AcquisitionForm({ garages }: { garages: GarageOption[] }) {
  const [state, formAction, pending] = useActionState(
    previewAcquiredVehicle,
    initialAcquisitionState
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>URL de l&apos;annonce</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <Input
                name="url"
                type="url"
                placeholder="https://www.leboncoin.fr/ad/voitures/..."
                required
                aria-invalid={Boolean(state.errors?.url)}
              />
              {state.errors?.url?.[0] && (
                <p className="mt-2 text-sm text-destructive">{state.errors.url[0]}</p>
              )}
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? "Récupération..." : "Prévisualiser"}
            </Button>
          </form>
          {!state.success && state.message && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {state.message}
            </p>
          )}
        </CardContent>
      </Card>

      {state.draft && (
        <>
          <DraftPreview draft={state.draft} />
          <CreateVehicleForm draft={state.draft} garages={garages} />
        </>
      )}
    </div>
  )
}

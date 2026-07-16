"use client"

import { useActionState, useState, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAcquiredVehicle, previewAcquiredVehicle } from "./actions"
import {
  getVehicleDisplayTitle,
  getVehicleSummary,
} from "./acquisition-presentation"
import { AcquisitionPhotoGallery } from "./photo-gallery"
import { AcquisitionProgress } from "./acquisition-progress"
import { getDisplayedCharacteristics } from "./characteristic-labels"
import { DataCompleteness } from "./data-completeness"
import { DraftVehicleEditor } from "./draft-vehicle-editor"
import { editableDraftVehicleSchema } from "./schema"
import { initialAcquisitionState } from "./state"
import type { DraftVehicle } from "./types"

type GarageOption = {
  id: string
  name: string
}

function getProviderName(provider: string) {
  return provider.toLocaleLowerCase("fr") === "leboncoin"
    ? "Leboncoin"
    : "Marketplace"
}

function DraftPreview({ draft }: { draft: DraftVehicle }) {
  const title = getVehicleDisplayTitle(draft)
  const characteristics = getDisplayedCharacteristics(draft.characteristics)
  const summary = getVehicleSummary(draft)

  return (
    <Card>
      <AcquisitionPhotoGallery
        key={draft.externalId}
        photos={draft.photos}
        title={title}
      />
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
            <CardDescription className="mt-1">
              {[draft.year, draft.mileage !== null ? `${draft.mileage.toLocaleString("fr-FR")} km` : null]
                .filter(Boolean)
                .join(" · ")}
            </CardDescription>
          </div>
          <Badge variant="secondary">
            Importé depuis {getProviderName(draft.provider)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {draft.advertisedPrice !== null && (
          <div className="rounded-lg bg-muted/60 p-4">
            <p className="text-sm text-muted-foreground">Prix de vente actuel</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {draft.advertisedPrice.toLocaleString("fr-FR")} €
            </p>
          </div>
        )}

        {draft.favoriteCount !== null && (
          <p className="text-sm text-muted-foreground">
            {draft.favoriteCount.toLocaleString("fr-FR")} favori
            {draft.favoriteCount > 1 ? "s" : ""} sur l’annonce
          </p>
        )}

        {characteristics.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold">Caractéristiques du véhicule</h3>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {characteristics.map(({ key, label, icon: Icon, value }) => (
                <div key={key} className="rounded-lg border p-3">
                  <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="size-4" aria-hidden="true" />
                    <span>{label}</span>
                  </dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {draft.description && (
          <details className="group rounded-lg border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 font-semibold marker:content-none">
              <span>
                Description
                <span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground group-open:hidden">
                  {summary}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-primary">
                <span className="group-open:hidden">Afficher la description complète</span>
                <span className="hidden group-open:inline">Réduire</span>
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <p className="whitespace-pre-wrap border-t px-4 py-5 text-sm leading-6 text-muted-foreground">
              {draft.description}
            </p>
          </details>
        )}
      </CardContent>
    </Card>
  )
}

function AcquisitionReview({
  draft,
  garages,
  importCard,
}: {
  draft: DraftVehicle
  garages: GarageOption[]
  importCard: ReactNode
}) {
  const [editableDraft, setEditableDraft] = useState(draft)
  const action = createAcquiredVehicle.bind(null, editableDraft)
  const [state, formAction, pending] = useActionState(action, initialAcquisitionState)
  const [purchasePrice, setPurchasePrice] = useState("")
  const finalStep = pending || (state.success && Boolean(state.vehicleId))
  const draftIsValid = editableDraftVehicleSchema.safeParse(editableDraft).success

  return (
    <div className="space-y-6">
      <AcquisitionProgress currentStep={finalStep ? 3 : 2} />
      {importCard}
      <DraftPreview draft={editableDraft} />
      <DataCompleteness
        draft={editableDraft}
        purchasePriceComplete={
          purchasePrice.trim() !== "" && Number(purchasePrice) >= 0
        }
      />

      {state.success && state.vehicleId ? (
        <Card className="border-emerald-200 bg-emerald-50/60">
          <CardContent className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-emerald-900">Véhicule créé dans le stock</p>
              <p className="mt-1 text-sm text-emerald-700">{state.message}</p>
            </div>
            <Button asChild>
              <Link href={`/stock/${state.vehicleId}`}>Voir la fiche véhicule</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="ring-primary/20">
          <CardHeader>
            <CardTitle className="text-xl">Compléments métier</CardTitle>
            <CardDescription>
              Les données publiques de l’annonce sont déjà préremplies. Ajoute uniquement
              les informations internes nécessaires à ton stock.
            </CardDescription>
            {draftIsValid && (
              <p className="mt-2 font-medium text-foreground">
                Le véhicule est prêt à rejoindre votre stock.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-6">
              <DraftVehicleEditor draft={editableDraft} onChange={setEditableDraft} />
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="garageId" className="text-sm font-medium">
                    Garage de destination
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
                  <p className="text-xs text-muted-foreground">
                    Information interne · non visible dans l’annonce
                  </p>
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
                    value={purchasePrice}
                    onChange={(event) => setPurchasePrice(event.target.value)}
                    placeholder="Ex. 35 000"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Information interne · modifiable avant création
                  </p>
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
                  placeholder="État du véhicule, négociation, travaux à prévoir…"
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
                <p className="text-xs text-muted-foreground">
                  Ces notes resteront privées et réservées à l’équipe du garage.
                </p>
                {state.errors?.notes?.[0] && (
                  <p className="text-sm text-destructive">{state.errors.notes[0]}</p>
                )}
              </div>
              {state.message && (
                <p className="text-sm text-destructive" role="status">
                  {state.message}
                </p>
              )}
              <div className="flex justify-end border-t pt-5">
                <Button
                  type="submit"
                  size="lg"
                  disabled={pending || garages.length === 0 || !draftIsValid}
                  className="w-full sm:w-auto"
                >
                  {pending ? "Création dans le stock..." : "Créer le véhicule dans le stock"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function AcquisitionForm({ garages }: { garages: GarageOption[] }) {
  const [state, formAction, pending] = useActionState(
    previewAcquiredVehicle,
    initialAcquisitionState
  )

  const importCard = (
    <Card>
      <CardHeader>
        <CardTitle>Importer une annonce Leboncoin</CardTitle>
        <CardDescription>
          Colle le lien de l’annonce pour récupérer automatiquement les informations du
          véhicule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
          <div className="flex-1">
            <Input
              name="url"
              type="url"
              placeholder="https://www.leboncoin.fr/ad/voitures/..."
              required
              aria-label="URL de l'annonce Leboncoin"
              aria-invalid={Boolean(state.errors?.url)}
            />
            {state.errors?.url?.[0] && (
              <p className="mt-2 text-sm text-destructive">{state.errors.url[0]}</p>
            )}
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Récupération de l’annonce..." : "Importer l’annonce"}
          </Button>
        </form>
        {!state.success && state.message && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {state.message}
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (state.draft) {
    return (
      <AcquisitionReview
        key={state.draft.externalId}
        draft={state.draft}
        garages={garages}
        importCard={importCard}
      />
    )
  }

  return (
    <div className="space-y-6">
      <AcquisitionProgress currentStep={1} />
      {importCard}
    </div>
  )
}

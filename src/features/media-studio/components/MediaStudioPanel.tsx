"use client"

import Link from "next/link"
import { Camera, Orbit, Sofa } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { MediaStudioSummary } from "../types/media-studio-summary"
import { VehicleImageGalleryClient } from "@/features/vehicles/components/vehicle-image-gallery-client"
import { VehicleImageUploadClient } from "@/features/vehicles/components/vehicle-image-upload-client"
import type { VehicleImageCategory } from "@/features/vehicles/image-category"

const tabs = [
  { id: "photos", label: "Photos", icon: Camera },
  { id: "exterior360", label: "360° extérieur", icon: Orbit },
  { id: "interior", label: "Visite intérieure", icon: Sofa },
] as const

type TabId = (typeof tabs)[number]["id"]

const statusLabels = {
  ABSENT: "Non créé",
  DRAFT: "Brouillon",
  IN_PROGRESS: "En cours",
  READY: "Prêt",
  PUBLISHED: "Publié",
} as const

type VehicleImage = {
  readonly id: string
  readonly url: string | null
  readonly type: VehicleImageCategory
  readonly is_primary: boolean
  readonly display_order?: number
}

export function MediaStudioPanel({
  summary,
  images,
}: {
  readonly summary: MediaStudioSummary
  readonly images: readonly VehicleImage[]
}) {
  const [activeTab, setActiveTab] = useState<TabId>("photos")

  return (
    <section id="media-studio" className="scroll-mt-6 rounded-xl border bg-white p-4 shadow-xs sm:p-6">
      <header className="mb-5 border-b pb-5">
        <p className="text-sm font-medium text-primary">Studio média</p>
        <h2 className="mt-1 text-xl font-semibold sm:text-2xl">Photos et visites immersives</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Préparez la galerie, la rotation extérieure et la visite intérieure de {summary.vehicleName}.
        </p>
      </header>

      <dl className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatusCard
          title="Photos"
          value={`${summary.photos.count}`}
          detail={summary.photos.hasPrimary ? "Photo principale définie" : "Photo principale manquante"}
        />
        <StatusCard
          title="360° extérieur"
          value={statusLabels[summary.exterior360.state]}
          detail={`${summary.exterior360.readyFrameCount} vue${summary.exterior360.readyFrameCount > 1 ? "s" : ""} prête${summary.exterior360.readyFrameCount > 1 ? "s" : ""}`}
        />
        <StatusCard
          title="Visite intérieure"
          value={statusLabels[summary.interiorTour.state]}
          detail={`${summary.interiorTour.readySceneCount} scène${summary.interiorTour.readySceneCount > 1 ? "s" : ""} · ${summary.interiorTour.hotspotCount} lien${summary.interiorTour.hotspotCount > 1 ? "s" : ""}`}
        />
      </dl>

      <div
        role="tablist"
        aria-label="Sections du studio média"
        className="mb-5 flex flex-wrap gap-2 border-b pb-3"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                selected ? "bg-zinc-900 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === "photos" ? (
        <div role="tabpanel" className="space-y-5">
          <VehicleImageUploadClient vehicleId={summary.vehicleId} />
          <VehicleImageGalleryClient
            images={images}
            vehicleId={summary.vehicleId}
            vehicleName={summary.vehicleName}
          />
        </div>
      ) : null}

      {activeTab === "exterior360" ? (
        <div role="tabpanel" className="space-y-4 rounded-lg border bg-muted/20 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            Photographiez le véhicule en faisant le tour complet, idéalement 24 à 36 vues régulièrement espacées.
          </p>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Conservez la même distance et hauteur de prise de vue.</li>
            <li>Minimum 12 vues pour publier, 24 recommandées.</li>
            <li>Vous pouvez reprendre une séquence inachevée.</li>
            <li>Aucune retouche automatique — vos photos sont utilisées telles quelles.</li>
          </ul>
          <Button asChild className="min-h-11">
            <Link href={summary.exterior360.manageHref}>
              {summary.exterior360.state === "ABSENT" ? "Créer le 360° extérieur" : "Gérer le 360° extérieur"}
            </Link>
          </Button>
        </div>
      ) : null}

      {activeTab === "interior" ? (
        <div role="tabpanel" className="space-y-4 rounded-lg border bg-muted/20 p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            Importez des panoramas équirectangulaires (format 2:1) pour une visite immersive de l&apos;habitacle.
          </p>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li>Une ou plusieurs scènes (avant, arrière, coffre…).</li>
            <li>Reliez les scènes avec des liens de navigation.</li>
            <li>Le visiteur pourra regarder autour de lui à 360°.</li>
          </ul>
          <Button asChild className="min-h-11">
            <Link href={summary.interiorTour.manageHref}>
              {summary.interiorTour.state === "ABSENT" ? "Créer la visite intérieure" : "Gérer la visite intérieure"}
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function StatusCard({
  title,
  value,
  detail,
}: {
  readonly title: string
  readonly value: string
  readonly detail: string
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 sm:p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
      <dd className="mt-1 text-sm text-muted-foreground">{detail}</dd>
    </div>
  )
}

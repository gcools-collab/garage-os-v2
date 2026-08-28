import type { InteriorTour } from "@/features/interior-tour/types"
import type { Vehicle360Sequence } from "@/features/vehicle-360/types"
import type {
  MediaStudioExterior360Status,
  MediaStudioInteriorStatus,
  MediaStudioPhotoStatus,
  MediaStudioSummary,
} from "../types/media-studio-summary"

type VehicleImageRow = Readonly<{
  readonly id: string
  readonly url: string | null
  readonly is_primary: boolean
  readonly display_order?: number
}>

function exterior360Status(
  sequence: Vehicle360Sequence | null,
  vehicleId: string,
): MediaStudioExterior360Status {
  const manageHref = `/stock/${vehicleId}/360`
  if (!sequence) {
    return { state: "ABSENT", frameCount: 0, readyFrameCount: 0, manageHref }
  }
  const readyFrameCount = sequence.frames.filter((frame) => frame.status === "READY").length
  if (sequence.status === "PUBLISHED") {
    return { state: "PUBLISHED", frameCount: sequence.frames.length, readyFrameCount, manageHref }
  }
  if (sequence.status === "READY") {
    return { state: "READY", frameCount: sequence.frames.length, readyFrameCount, manageHref }
  }
  if (readyFrameCount > 0) {
    return { state: "IN_PROGRESS", frameCount: sequence.frames.length, readyFrameCount, manageHref }
  }
  return { state: "DRAFT", frameCount: sequence.frames.length, readyFrameCount, manageHref }
}

function interiorStatus(tour: InteriorTour | null, vehicleId: string): MediaStudioInteriorStatus {
  const manageHref = `/stock/${vehicleId}/interior-tour`
  if (!tour) {
    return { state: "ABSENT", sceneCount: 0, readySceneCount: 0, hotspotCount: 0, manageHref }
  }
  const readySceneCount = tour.scenes.filter((scene) => scene.status === "READY").length
  if (tour.status === "PUBLISHED") {
    return {
      state: "PUBLISHED",
      sceneCount: tour.scenes.length,
      readySceneCount,
      hotspotCount: tour.hotspots.length,
      manageHref,
    }
  }
  if (tour.status === "READY") {
    return {
      state: "READY",
      sceneCount: tour.scenes.length,
      readySceneCount,
      hotspotCount: tour.hotspots.length,
      manageHref,
    }
  }
  if (readySceneCount > 0) {
    return {
      state: "IN_PROGRESS",
      sceneCount: tour.scenes.length,
      readySceneCount,
      hotspotCount: tour.hotspots.length,
      manageHref,
    }
  }
  return {
    state: "DRAFT",
    sceneCount: tour.scenes.length,
    readySceneCount,
    hotspotCount: tour.hotspots.length,
    manageHref,
  }
}

export function buildMediaStudioSummary(input: {
  readonly vehicleId: string
  readonly vehicleName: string
  readonly images: readonly VehicleImageRow[]
  readonly sequence: Vehicle360Sequence | null
  readonly tour: InteriorTour | null
}): MediaStudioSummary {
  const sorted = [...input.images].sort((first, second) => {
    if (first.is_primary !== second.is_primary) return first.is_primary ? -1 : 1
    return (first.display_order ?? 0) - (second.display_order ?? 0)
  })
  const primary = sorted.find((image) => image.is_primary) ?? sorted[0] ?? null
  const photos: MediaStudioPhotoStatus = {
    count: input.images.length,
    hasPrimary: Boolean(primary?.is_primary),
    primaryUrl: primary?.url ?? null,
  }
  return {
    vehicleId: input.vehicleId,
    vehicleName: input.vehicleName,
    photos,
    exterior360: exterior360Status(input.sequence, input.vehicleId),
    interiorTour: interiorStatus(input.tour, input.vehicleId),
  }
}

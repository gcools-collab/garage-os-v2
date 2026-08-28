export type MediaStudioPhotoStatus = Readonly<{
  readonly count: number
  readonly hasPrimary: boolean
  readonly primaryUrl: string | null
}>

export type MediaStudioExterior360Status = Readonly<{
  readonly state: "ABSENT" | "DRAFT" | "IN_PROGRESS" | "READY" | "PUBLISHED"
  readonly frameCount: number
  readonly readyFrameCount: number
  readonly manageHref: string
}>

export type MediaStudioInteriorStatus = Readonly<{
  readonly state: "ABSENT" | "DRAFT" | "IN_PROGRESS" | "READY" | "PUBLISHED"
  readonly sceneCount: number
  readonly readySceneCount: number
  readonly hotspotCount: number
  readonly manageHref: string
}>

export type MediaStudioSummary = Readonly<{
  readonly vehicleId: string
  readonly vehicleName: string
  readonly photos: MediaStudioPhotoStatus
  readonly exterior360: MediaStudioExterior360Status
  readonly interiorTour: MediaStudioInteriorStatus
}>

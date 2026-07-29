export type GarageMemberRole = "owner" | "admin" | "member" | string

export type AvailableGarage = {
  readonly garageId: string
  readonly garageName: string
  readonly garageSlug: string
  readonly memberRole: GarageMemberRole
  readonly city: string | null
}

export type ActiveGarageSession = {
  readonly userId: string
  readonly garageId: string | null
  readonly garageName: string | null
  readonly garageSlug: string | null
  readonly memberRole: GarageMemberRole | null
  readonly availableGarages: readonly AvailableGarage[]
  readonly requiresGarageSelection: boolean
  readonly requiresOnboarding: boolean
}

export type GarageMembership = AvailableGarage & {
  readonly userId: string
}

export type SetActiveGarageResult =
  | { readonly success: true; readonly garageId: string }
  | { readonly success: false; readonly error: string }

export type GarageSelectionViewModel = {
  readonly title: string
  readonly description: string
  readonly emptyMessage: string
  readonly garages: readonly {
    readonly garageId: string
    readonly garageName: string
    readonly garageSlug: string
    readonly roleLabel: string
    readonly cityLabel: string | null
  }[]
}

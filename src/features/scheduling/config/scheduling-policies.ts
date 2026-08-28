/**
 * Scheduling reservation policies are garage/service specific.
 * SAP decarbonization physically has 2 machines but reserves both for every
 * booking so only one decarbonization may overlap at a time.
 */
export type SchedulingReservationPolicy = Readonly<{
  readonly resourceType: string
  readonly physicalCapacity: number
  readonly reservedUnitsPerBooking: number
  readonly effectiveConcurrentCapacity: number
  readonly shockOptionInheritsBaseDuration: true
}>

const SAP_ENGINE_CLEANING: SchedulingReservationPolicy = {
  resourceType: "DECARBONIZATION_MACHINE",
  physicalCapacity: 2,
  reservedUnitsPerBooking: 2,
  effectiveConcurrentCapacity: 1,
  shockOptionInheritsBaseDuration: true,
}

export function resolveSchedulingReservationPolicy(input: {
  readonly garageSlug: string
  readonly serviceKey: string
}): SchedulingReservationPolicy | null {
  if (input.garageSlug === "sap" && input.serviceKey === "ENGINE_CLEANING") {
    return SAP_ENGINE_CLEANING
  }
  return null
}

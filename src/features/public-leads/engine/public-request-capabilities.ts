import type { GarageServiceConfiguration, PublicServiceId } from "@/features/public-site/services"
import type { PublicRequestType } from "../types"

export const requestService: Readonly<Partial<Record<PublicRequestType, PublicServiceId>>> = {
  VEHICLE_INQUIRY: "VEHICLE_SALES", TEST_DRIVE: "VEHICLE_SALES", TRADE_IN: "VEHICLE_SALES",
  CONSIGNMENT: "CONSIGNMENT", REGISTRATION: "REGISTRATION", ENGINE_CLEANING: "ENGINE_CLEANING",
  RENTAL: "RENTAL", WORKSHOP: "WORKSHOP", BODYWORK: "BODYWORK",
}

export function isPublicRequestAvailable(type: PublicRequestType, services: readonly GarageServiceConfiguration[]) {
  const required = requestService[type]
  return !required || services.some((service) => service.serviceKey === required && service.status === "ENABLED")
}

export function shouldCreatePublicAppointment(
  type: PublicRequestType,
  appointmentStartsAt: string | null,
): appointmentStartsAt is string {
  return type !== "TEST_DRIVE" && appointmentStartsAt !== null
}


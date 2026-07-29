import type { ActiveGarageSession } from "../types"

export type GarageSessionRoute = "/register" | "/onboarding" | "/select-garage" | "/dashboard"

export function resolveGarageSessionRoute(session: ActiveGarageSession | null): GarageSessionRoute {
  if (!session) return "/register"
  if (session.requiresOnboarding) return "/onboarding"
  if (session.requiresGarageSelection || !session.garageId) return "/select-garage"
  return "/dashboard"
}

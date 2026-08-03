import type { ActiveGarageSession } from "../types"

export type GarageSessionRoute = "/login" | "/onboarding" | "/select-garage" | "/dashboard"

export function resolveGarageSessionRoute(session: ActiveGarageSession | null): GarageSessionRoute {
  if (!session) return "/login"
  if (session.requiresOnboarding) return "/onboarding"
  if (session.requiresGarageSelection || !session.garageId) return "/select-garage"
  return "/dashboard"
}

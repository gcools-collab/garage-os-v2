import type { ActiveGarageSession, AvailableGarage, GarageMembership } from "../types"

const rolePriority = new Map([["owner", 0], ["admin", 1], ["member", 2]])

function compareMemberships(first: GarageMembership, second: GarageMembership) {
  return first.garageName.localeCompare(second.garageName, "fr") ||
    first.garageId.localeCompare(second.garageId) ||
    (rolePriority.get(first.memberRole) ?? 99) - (rolePriority.get(second.memberRole) ?? 99)
}

function availableGarage(membership: GarageMembership): AvailableGarage {
  return {
    garageId: membership.garageId,
    garageName: membership.garageName,
    garageSlug: membership.garageSlug,
    memberRole: membership.memberRole,
    city: membership.city,
  }
}

export function resolveActiveGarageSession({
  userId,
  memberships,
  persistedGarageId,
}: {
  readonly userId: string
  readonly memberships: readonly GarageMembership[]
  readonly persistedGarageId: string | null
}): ActiveGarageSession {
  const uniqueMemberships = [...memberships]
    .filter((membership) => membership.userId === userId)
    .sort(compareMemberships)
    .filter((membership, index, sorted) => sorted.findIndex((candidate) => candidate.garageId === membership.garageId) === index)
  const availableGarages = uniqueMemberships.map(availableGarage)

  if (availableGarages.length === 0) {
    return {
      userId,
      garageId: null,
      garageName: null,
      garageSlug: null,
      memberRole: null,
      availableGarages,
      requiresGarageSelection: false,
      requiresOnboarding: true,
    }
  }

  const persisted = persistedGarageId === null
    ? null
    : availableGarages.find((garage) => garage.garageId === persistedGarageId) ?? null
  const activeGarage = availableGarages.length === 1 ? availableGarages[0] : persisted

  return {
    userId,
    garageId: activeGarage?.garageId ?? null,
    garageName: activeGarage?.garageName ?? null,
    garageSlug: activeGarage?.garageSlug ?? null,
    memberRole: activeGarage?.memberRole ?? null,
    availableGarages,
    requiresGarageSelection: activeGarage === null,
    requiresOnboarding: false,
  }
}

import { resolveActiveGarageSession } from "@/features/tenant/engine/resolve-active-garage-session"
import type {
  ActiveGarageSession,
  GarageMembership,
} from "@/features/tenant/types"

export interface AuthenticatedIdentity {
  readonly userId: string
  readonly email: string | null
  readonly displayName: string | null
}

export type LoginFlowResult =
  | { readonly success: false; readonly message: string }
  | {
      readonly success: true
      readonly destination: "/onboarding" | "/select-garage" | "/dashboard"
      readonly activeGarageId: string | null
      readonly identity: AuthenticatedIdentity
      readonly membershipCount: number
    }

export interface LoginFlowDependencies {
  readonly authenticate: () => Promise<
    | { readonly success: true; readonly identity: AuthenticatedIdentity }
    | { readonly success: false }
  >
  readonly loadMemberships: (userId: string) => Promise<readonly GarageMembership[]>
  readonly persistGarage: (garageId: string) => Promise<void>
}

export async function loginExistingUser(
  dependencies: LoginFlowDependencies
): Promise<LoginFlowResult> {
  const authentication = await dependencies.authenticate()
  if (!authentication.success) {
    return { success: false, message: "Email ou mot de passe incorrect." }
  }
  const memberships = await dependencies.loadMemberships(authentication.identity.userId)
  const session = resolveActiveGarageSession({
    userId: authentication.identity.userId,
    userEmail: authentication.identity.email,
    userDisplayName: authentication.identity.displayName,
    memberships,
    persistedGarageId: null,
  })
  if (session.garageId) await dependencies.persistGarage(session.garageId)
  const destination = session.requiresOnboarding
    ? "/onboarding"
    : session.requiresGarageSelection
      ? "/select-garage"
      : "/dashboard"
  return {
    success: true,
    destination,
    activeGarageId: session.garageId,
    identity: authentication.identity,
    membershipCount: session.availableGarages.length,
  }
}

export function logAuthDiagnostic(input: {
  readonly userId: string | null
  readonly email: string | null
  readonly membershipCount: number
  readonly activeGarageId: string | null
  readonly reason: string
}) {
  if (process.env.NODE_ENV !== "development") return
  console.info("Auth session diagnostic", input)
}

export async function logoutSession(dependencies: {
  readonly signOut: () => Promise<void>
  readonly clearGarage: () => Promise<void>
}) {
  await dependencies.signOut()
  await dependencies.clearGarage()
}

export function resolveProtectedAuthRoute(session: ActiveGarageSession | null) {
  return session ? resolveActiveGarageSessionRoute(session) : "/auth/recover"
}

export const resolveRootAuthRoute = resolveProtectedAuthRoute

function resolveActiveGarageSessionRoute(session: ActiveGarageSession) {
  if (session.requiresOnboarding) return "/onboarding" as const
  if (session.requiresGarageSelection || !session.garageId) return "/select-garage" as const
  return "/dashboard" as const
}

import "server-only"

import { cache } from "react"

import { resolveActiveGarageSession } from "../engine"
import type { ActiveGarageSession } from "../types"
import { readActiveGarageCookie } from "./active-garage-cookie"
import { loadCurrentUserGarageMemberships } from "./load-garage-memberships"

export const getActiveGarageSession = cache(async (): Promise<ActiveGarageSession | null> => {
  const context = await loadCurrentUserGarageMemberships()
  if (!context) return null

  return resolveActiveGarageSession({
    userId: context.userId,
    memberships: context.memberships,
    persistedGarageId: await readActiveGarageCookie(),
  })
})

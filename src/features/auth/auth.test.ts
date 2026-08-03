import assert from "node:assert/strict"
import test from "node:test"

import { resolveActiveGarageSession } from "@/features/tenant/engine/resolve-active-garage-session"
import type { GarageMembership } from "@/features/tenant/types"
import {
  loginExistingUser,
  logoutSession,
  resolveProtectedAuthRoute,
  resolveRootAuthRoute,
} from "./session-flow"

const USER_ID = "e8dc75f8-4362-4a0a-9357-e20633fa3263"
const GARAGE_ID = "363f2dc0-bfd3-48d6-a1cc-96e113e96094"
const GARAGE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function membership(garageId = GARAGE_ID): GarageMembership {
  return {
    userId: USER_ID,
    garageId,
    garageName: garageId === GARAGE_ID ? "Garage principal" : "Garage secondaire",
    garageSlug: garageId === GARAGE_ID ? "garage-principal" : "garage-secondaire",
    memberRole: garageId === GARAGE_ID ? "owner" : "member",
    city: null,
  }
}

function loginDependencies(memberships: readonly GarageMembership[], authenticated = true) {
  const persisted: string[] = []
  return {
    persisted,
    dependencies: {
      authenticate: async () => authenticated
        ? { success: true as const, identity: { userId: USER_ID, email: "ag-f4@live.fr", displayName: "AG-F4" } }
        : { success: false as const },
      loadMemberships: async () => memberships,
      persistGarage: async (garageId: string) => { persisted.push(garageId) },
    },
  }
}

test("connexion réussie avec un garage et persistance du garage autorisé", async () => {
  const fixture = loginDependencies([membership()])
  const result = await loginExistingUser(fixture.dependencies)
  assert.equal(result.success, true)
  if (!result.success) return
  assert.equal(result.destination, "/dashboard")
  assert.equal(result.activeGarageId, GARAGE_ID)
  assert.deepEqual(fixture.persisted, [GARAGE_ID])
})

test("connexion sans garage redirige vers onboarding sans en créer", async () => {
  const fixture = loginDependencies([])
  const result = await loginExistingUser(fixture.dependencies)
  assert.equal(result.success && result.destination, "/onboarding")
  assert.deepEqual(fixture.persisted, [])
})

test("connexion avec plusieurs garages demande une sélection", async () => {
  const fixture = loginDependencies([membership(), membership(GARAGE_B)])
  const result = await loginExistingUser(fixture.dependencies)
  assert.equal(result.success && result.destination, "/select-garage")
  assert.deepEqual(fixture.persisted, [])
})

test("mot de passe incorrect ne charge ni ne persiste de garage", async () => {
  let membershipsLoaded = false
  const result = await loginExistingUser({
    authenticate: async () => ({ success: false }),
    loadMemberships: async () => { membershipsLoaded = true; return [] },
    persistGarage: async () => { throw new Error("unexpected") },
  })
  assert.deepEqual(result, { success: false, message: "Email ou mot de passe incorrect." })
  assert.equal(membershipsLoaded, false)
})

test("utilisateur déconnecté et session expirée utilisent la récupération", () => {
  assert.equal(resolveProtectedAuthRoute(null), "/auth/recover")
  assert.equal(resolveRootAuthRoute(null), "/auth/recover")
})

test("un cookie garage obsolète est ignoré avec un garage unique", () => {
  const session = resolveActiveGarageSession({
    userId: USER_ID,
    userEmail: "ag-f4@live.fr",
    memberships: [membership()],
    persistedGarageId: GARAGE_B,
  })
  assert.equal(session.garageId, GARAGE_ID)
  assert.equal(session.requiresGarageSelection, false)
})

test("la déconnexion termine la session puis nettoie le garage", async () => {
  const calls: string[] = []
  await logoutSession({
    signOut: async () => { calls.push("signOut") },
    clearGarage: async () => { calls.push("clearGarage") },
  })
  assert.deepEqual(calls, ["signOut", "clearGarage"])
})

test("la racine envoie un utilisateur authentifié vers son dashboard", () => {
  const session = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [membership()],
    persistedGarageId: GARAGE_ID,
  })
  assert.equal(resolveRootAuthRoute(session), "/dashboard")
})

test("dashboard sans session retourne une redirection sans exception", () => {
  assert.doesNotThrow(() => resolveProtectedAuthRoute(null))
  assert.equal(resolveProtectedAuthRoute(null), "/auth/recover")
})

import assert from "node:assert/strict"
import test from "node:test"

import { setActiveGarageWithDependencies } from "./data/set-active-garage"
import { resolveActiveGarageSession, resolveGarageSessionRoute } from "./engine"
import type { GarageMembership } from "./types"

const USER_ID = "11111111-1111-4111-8111-111111111111"
const GARAGE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const GARAGE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

function membership(
  garageId: string,
  garageName: string,
  userId = USER_ID
): GarageMembership {
  return {
    userId,
    garageId,
    garageName,
    garageSlug: garageName.toLowerCase().replaceAll(" ", "-"),
    memberRole: garageId === GARAGE_A ? "owner" : "member",
    city: null,
  }
}

test("résout zéro garage vers l'onboarding", () => {
  const session = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [],
    persistedGarageId: null,
  })

  assert.equal(session.requiresOnboarding, true)
  assert.equal(session.requiresGarageSelection, false)
  assert.equal(session.garageId, null)
})

test("sélectionne automatiquement un garage unique", () => {
  const session = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [membership(GARAGE_A, "S.A.P")],
    persistedGarageId: null,
  })

  assert.equal(session.garageId, GARAGE_A)
  assert.equal(session.garageName, "S.A.P")
  assert.equal(session.requiresGarageSelection, false)
})

test("demande une sélection avec plusieurs garages sans préférence valide", () => {
  const session = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [membership(GARAGE_A, "S.A.P"), membership(GARAGE_B, "Auto Nord")],
    persistedGarageId: null,
  })

  assert.equal(session.garageId, null)
  assert.equal(session.requiresGarageSelection, true)
  assert.equal(session.availableGarages.length, 2)
})

test("réutilise uniquement un garage persisté encore autorisé", () => {
  const memberships = [membership(GARAGE_A, "S.A.P"), membership(GARAGE_B, "Auto Nord")]
  const valid = resolveActiveGarageSession({ userId: USER_ID, memberships, persistedGarageId: GARAGE_B })
  const invalid = resolveActiveGarageSession({
    userId: USER_ID,
    memberships,
    persistedGarageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  })

  assert.equal(valid.garageId, GARAGE_B)
  assert.equal(valid.requiresGarageSelection, false)
  assert.equal(invalid.garageId, null)
  assert.equal(invalid.requiresGarageSelection, true)
})

test("ignore une appartenance supprimée ou appartenant à un autre utilisateur", () => {
  const session = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [membership(GARAGE_A, "S.A.P", "22222222-2222-4222-8222-222222222222")],
    persistedGarageId: GARAGE_A,
  })

  assert.equal(session.requiresOnboarding, true)
  assert.equal(session.availableGarages.length, 0)
})

test("reste déterministe et ne mute pas les appartenances", () => {
  const memberships = [membership(GARAGE_A, "S.A.P"), membership(GARAGE_B, "Auto Nord")]
  const before = structuredClone(memberships)
  const first = resolveActiveGarageSession({ userId: USER_ID, memberships, persistedGarageId: GARAGE_A })
  const second = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [...memberships].reverse(),
    persistedGarageId: GARAGE_A,
  })

  assert.deepEqual(first, second)
  assert.deepEqual(memberships, before)
})

test("refuse setActiveGarage pour un garage non autorisé", async () => {
  let persistedGarageId: string | null = null
  const result = await setActiveGarageWithDependencies(GARAGE_B, {
    loadMemberships: async () => ({
      userId: USER_ID,
      memberships: [membership(GARAGE_A, "S.A.P")],
    }),
    persistGarageId: async (garageId) => { persistedGarageId = garageId },
  })

  assert.deepEqual(result, {
    success: false,
    error: "Vous n’êtes pas autorisé à accéder à ce garage.",
  })
  assert.equal(persistedGarageId, null)
})

test("persiste setActiveGarage après validation de l'appartenance", async () => {
  let persistedGarageId: string | null = null
  const result = await setActiveGarageWithDependencies(GARAGE_A, {
    loadMemberships: async () => ({
      userId: USER_ID,
      memberships: [membership(GARAGE_A, "S.A.P")],
    }),
    persistGarageId: async (garageId) => { persistedGarageId = garageId },
  })

  assert.deepEqual(result, { success: true, garageId: GARAGE_A })
  assert.equal(persistedGarageId, GARAGE_A)
})

test("route vers onboarding et sélecteur uniquement lorsque nécessaire", () => {
  const onboarding = resolveActiveGarageSession({ userId: USER_ID, memberships: [], persistedGarageId: null })
  const selection = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [membership(GARAGE_A, "S.A.P"), membership(GARAGE_B, "Auto Nord")],
    persistedGarageId: null,
  })
  const dashboard = resolveActiveGarageSession({
    userId: USER_ID,
    memberships: [membership(GARAGE_A, "S.A.P")],
    persistedGarageId: null,
  })

  assert.equal(resolveGarageSessionRoute(null), "/login")
  assert.equal(resolveGarageSessionRoute(onboarding), "/onboarding")
  assert.equal(resolveGarageSessionRoute(selection), "/select-garage")
  assert.equal(resolveGarageSessionRoute(dashboard), "/dashboard")
})

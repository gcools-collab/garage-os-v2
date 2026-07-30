import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildNotificationCenter } from "./builders"
import {
  buildNotificationCommand,
  canReadNotification,
  dispatchInAppNotification,
  isSafeInternalNotificationHref,
} from "./engine"
import type { NotificationRecord } from "./types"

const notification: NotificationRecord = {
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  garage_id: "garage-a",
  user_id: null,
  type: "NEW_LEAD",
  title: "Nouveau prospect",
  message: "Une nouvelle demande concerne la Peugeot 3008.",
  href: "/leads/bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  entity_type: "lead",
  entity_id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
  read_at: null,
  dismissed_at: null,
  created_at: "2026-07-30T09:45:00.000Z",
}

test("construit une notification de lead sans coordonnées sensibles", () => {
  const command = buildNotificationCommand({
    type: "NEW_LEAD",
    leadId: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    vehicleTitle: "Peugeot 3008",
  })
  assert.equal(command.title, "Nouveau prospect")
  assert.equal(command.href, "/leads/bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb")
  assert.doesNotMatch(command.message, /@|06\s?\d/)
})

test("valide uniquement les href internes", () => {
  assert.equal(isSafeInternalNotificationHref("/leads/a"), true)
  assert.equal(isSafeInternalNotificationHref("//evil.test"), false)
  assert.equal(isSafeInternalNotificationHref("https://evil.test"), false)
})

test("compte les non lues et prépare les libellés français", () => {
  const center = buildNotificationCenter(
    [notification, { ...notification, id: "read", read_at: "2026-07-30T09:50:00.000Z" }],
    1,
    new Date("2026-07-30T10:00:00.000Z")
  )
  assert.equal(center.unreadCount, 1)
  assert.equal(center.items[0]?.typeLabel, "Prospect")
  assert.equal(center.items[0]?.dateLabel, "il y a 15 min")
})

test("protège les notifications individuelles et partage celles du garage", () => {
  assert.equal(canReadNotification({
    member: true, currentUserId: "user-a", recipientUserId: null, role: "member",
  }), true)
  assert.equal(canReadNotification({
    member: true, currentUserId: "user-a", recipientUserId: "user-b", role: "member",
  }), false)
  assert.equal(canReadNotification({
    member: true, currentUserId: "user-a", recipientUserId: "user-b", role: "admin",
  }), true)
  assert.equal(canReadNotification({
    member: false, currentUserId: "user-a", recipientUserId: null, role: null,
  }), false)
})

test("le dispatcher livre seulement IN_APP sans simuler email ou SMS", () => {
  const result = dispatchInAppNotification(["IN_APP", "EMAIL", "SMS"])
  assert.deepEqual(result.deliveredChannels, ["IN_APP"])
  assert.deepEqual(result.skippedChannels, ["EMAIL", "SMS"])
})

test("les actions de lecture sont tenant scoped et les erreurs de notification restent isolées", () => {
  const actions = readFileSync("src/features/notifications/actions/notification-actions.ts", "utf8")
  const commercialActions = readFileSync("src/features/commercial/actions/commercial-actions.ts", "utf8")
  assert.match(actions, /\.eq\("garage_id", session\.garageId\)/)
  assert.match(commercialActions, /Commercial notification persistence failed/)
  assert.doesNotMatch(commercialActions, /throw new Error\(`Notification/)
})

test("les policies interdisent anon et protègent les destinataires", () => {
  const sql = readFileSync("supabase/migrations/20260730000031_create_commercial_workflow.sql", "utf8")
  assert.match(sql, /revoke all on table public\.notifications from anon/i)
  assert.match(sql, /notifications\.user_id = auth\.uid\(\)/i)
  assert.doesNotMatch(sql, /with check\s*\(\s*true\s*\)/i)
})

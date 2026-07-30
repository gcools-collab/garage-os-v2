import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const root = process.cwd()
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260730000033_create_garage_copilot.sql"),
  "utf8"
)
const actionSource = readFileSync(
  resolve(root, "src/features/copilot/actions/copilot-actions.ts"),
  "utf8"
)
const pageSource = readFileSync(
  resolve(root, "src/app/(dashboard)/copilot/page.tsx"),
  "utf8"
)

test("les conversations sont tenant-scoped et privées par créateur", () => {
  assert.match(migration, /created_by_user_id = auth\.uid\(\)/)
  assert.match(migration, /gm\.garage_id = copilot_conversations\.garage_id/)
  assert.doesNotMatch(migration, /using\s*\(\s*true\s*\)/i)
  assert.doesNotMatch(migration, /with check\s*\(\s*true\s*\)/i)
})

test("les messages restent liés à une conversation active du même garage", () => {
  assert.match(migration, /foreign key \(conversation_id, garage_id\)/)
  assert.match(migration, /c\.created_by_user_id = auth\.uid\(\)/)
  assert.match(migration, /c\.status = 'ACTIVE'/)
  assert.match(migration, /new\.garage_id is distinct from old\.garage_id/)
})

test("anon ne reçoit aucun accès et les payloads sont bornés", () => {
  assert.match(migration, /revoke all on table public\.copilot_conversations from anon/)
  assert.match(migration, /revoke all on table public\.copilot_messages from anon/)
  assert.match(migration, /pg_column_size\(structured_payload\) <= 32768/)
  assert.match(migration, /char_length\(content\) between 1 and 6000/)
})

test("les actions résolvent la session et n’acceptent jamais garageId", () => {
  assert.match(actionSource, /getActiveGarageSession/)
  assert.doesNotMatch(actionSource, /garageId:\s*z\./)
  assert.match(actionSource, /\.eq\("garage_id", session\.garageId\)/)
  assert.match(actionSource, /revalidatePath\("\/copilot"\)/)
})

test("la page Copilot possède un seul h1", () => {
  assert.equal((pageSource.match(/<h1\b/g) ?? []).length, 1)
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { renderToStaticMarkup } from "react-dom/server"
import {
  buildCommercialDashboardSignal,
  buildCommercialInbox,
  buildCommercialLeadWorkspace,
} from "./builders"
import { CommercialInbox } from "./components/CommercialInbox"
import {
  buildInitialCommercialTask,
  canAssignLead,
  canManageCommercialTask,
  canManageLeadNote,
  canTransitionCommercialTaskStatus,
  computeCommercialTaskPriority,
  computeLeadNextAction,
  resolveEffectiveTaskStatus,
} from "./engine"
import {
  formatCommercialDate,
  formatCommercialDelay,
} from "./presentation"
import type {
  CommercialInboxData,
  CommercialLeadRecord,
  CommercialTaskRecord,
} from "./types"

const NOW = new Date("2026-07-30T10:00:00.000Z")

function lead(overrides: Partial<CommercialLeadRecord> = {}): CommercialLeadRecord {
  return {
    id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    garage_id: "garage-a",
    vehicle_id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    customer_name: "Julie Martin",
    customer_phone: "0612345678",
    customer_email: null,
    vehicle_title_snapshot: "Peugeot 3008",
    type: "CALLBACK_REQUEST",
    status: "NEW",
    created_at: "2026-07-29T08:00:00.000Z",
    first_contacted_at: null,
    last_contacted_at: null,
    next_action_at: "2026-07-30T08:00:00.000Z",
    assigned_user_id: null,
    preferred_date: null,
    ...overrides,
  }
}

function task(overrides: Partial<CommercialTaskRecord> = {}): CommercialTaskRecord {
  return {
    id: "cccccccc-3333-4333-8333-cccccccccccc",
    garage_id: "garage-a",
    lead_id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    vehicle_id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    assigned_user_id: null,
    created_by_user_id: null,
    type: "CALL_PROSPECT",
    status: "OPEN",
    priority: "NORMAL",
    title: "Appeler le prospect",
    description: null,
    due_at: "2026-07-30T08:00:00.000Z",
    completed_at: null,
    cancelled_at: null,
    snoozed_until: null,
    created_at: "2026-07-29T08:00:00.000Z",
    updated_at: "2026-07-29T08:00:00.000Z",
    ...overrides,
  }
}

function inboxData(overrides: Partial<CommercialInboxData> = {}): CommercialInboxData {
  return {
    leads: [lead()],
    tasks: [task()],
    members: [{ userId: "user-a", name: "Paul Durand" }],
    ...overrides,
  }
}

test("crée la bonne tâche initiale pour chaque type de lead", () => {
  const expected = {
    CALLBACK_REQUEST: "CALL_PROSPECT",
    APPOINTMENT_REQUEST: "CONFIRM_APPOINTMENT",
    TEST_DRIVE_REQUEST: "PREPARE_TEST_DRIVE",
    VEHICLE_QUESTION: "SEND_EMAIL",
    PRICE_INQUIRY: "FOLLOW_UP",
    GENERAL_INQUIRY: "UPDATE_LEAD",
  } as const
  for (const [leadType, taskType] of Object.entries(expected)) {
    assert.equal(buildInitialCommercialTask({
      leadType: leadType as keyof typeof expected,
      createdAt: "2026-07-30T10:00:00.000Z",
      leadId: "lead-a",
      vehicleId: "vehicle-a",
    }).type, taskType)
  }
})

test("calcule les priorités urgente, normale et faible avec des raisons", () => {
  const urgent = computeCommercialTaskPriority({
    dueAt: "2026-07-29T08:00:00.000Z",
    leadNeverContacted: true,
    leadType: "TEST_DRIVE_REQUEST",
    createdAt: "2026-07-28T08:00:00.000Z",
    vehicleAvailable: true,
    now: NOW,
  })
  const normal = computeCommercialTaskPriority({
    dueAt: "2026-07-31T08:00:00.000Z",
    leadNeverContacted: true,
    leadType: "GENERAL_INQUIRY",
    createdAt: "2026-07-30T08:00:00.000Z",
    vehicleAvailable: true,
    now: NOW,
  })
  const low = computeCommercialTaskPriority({
    dueAt: null,
    leadNeverContacted: false,
    leadType: "GENERAL_INQUIRY",
    createdAt: "2026-07-30T08:00:00.000Z",
    vehicleAvailable: true,
    now: NOW,
  })
  assert.equal(urgent.priority, "URGENT")
  assert.ok(urgent.reasons.includes("Action en retard"))
  assert.equal(normal.priority, "NORMAL")
  assert.equal(low.priority, "LOW")
})

test("résout une tâche reportée échue sans cron", () => {
  assert.equal(resolveEffectiveTaskStatus(task({
    status: "SNOOZED",
    snoozed_until: "2026-07-30T09:00:00.000Z",
  }), NOW), "OPEN")
  assert.equal(resolveEffectiveTaskStatus(task({
    status: "SNOOZED",
    snoozed_until: "2026-07-30T11:00:00.000Z",
  }), NOW), "SNOOZED")
})

test("applique les transitions de tâche autorisées et terminales", () => {
  assert.equal(canTransitionCommercialTaskStatus("OPEN", "IN_PROGRESS"), true)
  assert.equal(canTransitionCommercialTaskStatus("IN_PROGRESS", "COMPLETED"), true)
  assert.equal(canTransitionCommercialTaskStatus("OPEN", "SNOOZED"), true)
  assert.equal(canTransitionCommercialTaskStatus("COMPLETED", "OPEN"), false)
  assert.equal(canTransitionCommercialTaskStatus("CANCELLED", "OPEN"), false)
})

test("recommande un premier contact puis une tâche ouverte", () => {
  const withoutTask = computeLeadNextAction({
    status: "NEW",
    type: "CALLBACK_REQUEST",
    firstContactedAt: null,
    tasks: [],
    preferredDate: null,
    vehicleAvailable: true,
    now: NOW,
  })
  const withTask = computeLeadNextAction({
    status: "CONTACTED",
    type: "CALLBACK_REQUEST",
    firstContactedAt: "2026-07-30T09:00:00.000Z",
    tasks: [task({ title: "Relancer demain", type: "FOLLOW_UP" })],
    preferredDate: null,
    vehicleAvailable: true,
    now: NOW,
  })
  assert.equal(withoutTask.label, "Appeler le prospect")
  assert.equal(withTask.label, "Relancer demain")
})

test("recommande la confirmation après planification de rendez-vous", () => {
  const action = computeLeadNextAction({
    status: "APPOINTMENT_PLANNED",
    type: "APPOINTMENT_REQUEST",
    firstContactedAt: "2026-07-30T09:00:00.000Z",
    tasks: [],
    preferredDate: "2026-08-01",
    vehicleAvailable: true,
    now: NOW,
  })
  assert.equal(action.type, "CONFIRM_APPOINTMENT")
})

test("un lead gagné ou perdu ne demande plus de suivi", () => {
  for (const status of ["WON", "LOST"] as const) {
    const action = computeLeadNextAction({
      status,
      type: "GENERAL_INQUIRY",
      firstContactedAt: null,
      tasks: [task()],
      preferredDate: null,
      vehicleAvailable: true,
      now: NOW,
    })
    assert.equal(action.type, null)
  }
})

test("les permissions commerciales couvrent member, admin et owner", () => {
  assert.equal(canManageCommercialTask("member"), true)
  assert.equal(canAssignLead("member", true), true)
  assert.equal(canAssignLead("member", false), false)
  assert.equal(canAssignLead("admin", false), true)
  assert.equal(canManageLeadNote("member", "user-a", "user-a"), true)
  assert.equal(canManageLeadNote("owner", "user-a", "user-b"), true)
})

test("formate les dates de manière déterministe en français", () => {
  assert.match(formatCommercialDate("2026-07-30T14:30:00.000Z", NOW), /aujourd’hui à/)
  assert.equal(formatCommercialDelay("2026-07-30T08:00:00.000Z", NOW), "en retard de 2 h")
})

test("le builder classe retard, aujourd’hui et futur sans muter les données", () => {
  const data = inboxData({
    tasks: [
      task(),
      task({ id: "future", due_at: "2026-08-01T10:00:00.000Z" }),
      task({ id: "today", due_at: "2026-07-30T15:00:00.000Z" }),
      task({ id: "done", status: "COMPLETED", completed_at: "2026-07-30T09:00:00.000Z" }),
    ],
  })
  const before = structuredClone(data)
  const inbox = buildCommercialInbox(data, NOW)
  assert.equal(inbox.summary.overdue, 1)
  assert.equal(inbox.summary.dueToday, 1)
  assert.equal(inbox.upcoming.length, 1)
  assert.equal(inbox.recentlyCompleted.length, 1)
  assert.deepEqual(data, before)
})

test("le ViewModel est français et le composant garde un seul h1", () => {
  const inbox = buildCommercialInbox(inboxData(), NOW)
  const html = renderToStaticMarkup(<CommercialInbox inbox={inbox} />)
  assert.match(html, /Boîte commerciale/)
  assert.match(html, /À traiter maintenant/)
  assert.equal((html.match(/<h1/g) ?? []).length, 1)
})

test("le signal dashboard pointe vers la boîte commerciale", () => {
  const signal = buildCommercialDashboardSignal(inboxData(), NOW)
  assert.equal(signal.href, "/commercial")
  assert.equal(signal.overdue, 1)
  assert.match(signal.headline, /retard/)
})

test("le détail commercial prépare attribution, tâches et notes", () => {
  const workspace = buildCommercialLeadWorkspace({
    lead: lead({ assigned_user_id: "user-a" }),
    context: {
      tasks: [task({ assigned_user_id: "user-a" })],
      notes: [{
        id: "note-a", garage_id: "garage-a", lead_id: lead().id,
        author_user_id: "user-a", content: "Rappeler demain",
        created_at: "2026-07-30T09:00:00.000Z", updated_at: null, deleted_at: null,
      }],
      members: [{ userId: "user-a", name: "Paul Durand" }],
    },
    currentUserId: "user-a",
    now: NOW,
  })
  assert.equal(workspace.assignedUserLabel, "Paul Durand")
  assert.equal(workspace.notes[0]?.canManage, true)
  assert.equal(workspace.tasks.length, 1)
})

test("la migration impose RLS, tenant scope, raisons de perte et création atomique", () => {
  const sql = readFileSync("supabase/migrations/20260730000031_create_commercial_workflow.sql", "utf8")
  assert.match(sql, /alter table public\.commercial_tasks enable row level security/i)
  assert.match(sql, /validate_commercial_task_scope/i)
  assert.match(sql, /Assignee is not a garage member/i)
  assert.match(sql, /loss_reason public\.lead_loss_reason/i)
  assert.match(sql, /insert into public\.commercial_tasks/i)
  assert.match(sql, /insert into public\.notifications/i)
  assert.doesNotMatch(sql, /using\s*\(\s*true\s*\)/i)
})

test("les repositories filtrent toujours le garage avant présentation", () => {
  const source = readFileSync("src/features/commercial/data/commercial-repository.ts", "utf8")
  assert.match(source, /\.eq\("garage_id", session\.garageId\)/)
  assert.doesNotMatch(source, /select\("\*"\)/)
})

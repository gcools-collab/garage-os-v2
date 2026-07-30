import type { CopilotActionRegistryEntry, CopilotActionType } from "../types"

export const copilotActionRegistry = Object.freeze({
  OPEN_ENTITY: {
    action: "OPEN_ENTITY", targetType: "ANY", requiresConfirmation: false,
    permission: "MEMBER", executeKey: "OPEN_ENTITY",
  },
  CREATE_TASK: {
    action: "CREATE_TASK", targetType: "ANY", requiresConfirmation: true,
    permission: "MEMBER", executeKey: "CREATE_TASK",
  },
  CHANGE_PRICE: {
    action: "CHANGE_PRICE", targetType: "VEHICLE", requiresConfirmation: true,
    permission: "MEMBER", executeKey: "CHANGE_PRICE",
  },
  CHANGE_STATUS: {
    action: "CHANGE_STATUS", targetType: "VEHICLE", requiresConfirmation: true,
    permission: "MEMBER", executeKey: "CHANGE_STATUS",
  },
  MARK_CONTACTED: {
    action: "MARK_CONTACTED", targetType: "LEAD", requiresConfirmation: true,
    permission: "MEMBER", executeKey: "MARK_CONTACTED",
  },
} satisfies Readonly<Record<CopilotActionType, CopilotActionRegistryEntry>>)

export function getCopilotActionRegistryEntry(action: CopilotActionType) {
  return copilotActionRegistry[action]
}

import "server-only"

import { defaultGarageIntelligenceConfig } from "@/features/intelligence/config"
import { getGarageIntelligenceSourceData } from "@/features/intelligence/data"
import {
  buildGarageIntelligenceBrief,
  buildGarageIntelligenceSnapshot,
} from "@/features/intelligence/engine"
import type { ActiveGarageSession } from "@/features/tenant"
import { buildCopilotGarageContext } from "../context"
import type { CopilotGarageContextSnapshot } from "../types"

export async function getCopilotGarageContextSnapshot(
  session: ActiveGarageSession,
  now = new Date()
): Promise<CopilotGarageContextSnapshot> {
  if (!session.garageId || !session.garageName) throw new Error("COPILOT_NO_ACTIVE_GARAGE")
  const source = await getGarageIntelligenceSourceData(session)
  const snapshot = buildGarageIntelligenceSnapshot({
    garage: {
      id: session.garageId,
      name: session.garageName,
      timezone: "Europe/Paris",
    },
    source,
    now,
  })
  const brief = buildGarageIntelligenceBrief({
    snapshot,
    config: defaultGarageIntelligenceConfig,
    now,
    locale: "fr-FR",
    timezone: snapshot.garage.timezone,
  })
  return buildCopilotGarageContext(snapshot, brief)
}

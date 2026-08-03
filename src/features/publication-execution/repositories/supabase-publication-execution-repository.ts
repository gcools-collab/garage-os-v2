import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { PublicationPersistenceCommand } from "../types"
import type { PublicationExecutionRepository } from "./publication-execution-repository"

export class SupabasePublicationExecutionRepository implements PublicationExecutionRepository {
  async persist(command: PublicationPersistenceCommand): Promise<boolean> {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("execute_vehicle_publication_transition", {
      p_vehicle_id: command.vehicleId,
      p_garage_id: command.garageId,
      p_expected_status: command.expectedVehicleStatus,
      p_target_status: command.targetVehicleStatus,
      p_publication_status: command.publicationStatus,
      p_published_at: command.publishedAt,
      p_event_database_type: command.eventDatabaseType,
      p_event_description: command.event.description,
      p_event_metadata: {
        ...command.event.metadata,
        actorId: command.event.actorId,
        previousStatus: command.event.previousStatus,
        nextStatus: command.event.nextStatus,
        occurredAt: command.event.occurredAt,
      },
    })
    if (error) {
      console.error("Publication transition persistence failed", {
        operation: command.event.type,
        code: error.code,
      })
      return false
    }
    return data === true
  }
}

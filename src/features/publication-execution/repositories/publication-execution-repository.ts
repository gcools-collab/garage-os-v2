import type { PublicationPersistenceCommand } from "../types"

export interface PublicationExecutionRepository {
  persist(command: PublicationPersistenceCommand): Promise<boolean>
}

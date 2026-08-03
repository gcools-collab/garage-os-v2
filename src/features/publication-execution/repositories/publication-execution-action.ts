"use server"

import { z } from "zod"

import {
  publicationExecutionActions,
  type PublicationExecutionActionState,
} from "../types"

const inputSchema = z.object({
  vehicleId: z.uuid(),
  action: z.enum(publicationExecutionActions),
})

export async function executePublicationAction(
  previousState: PublicationExecutionActionState,
  formData: FormData
): Promise<PublicationExecutionActionState> {
  void previousState
  const parsed = inputSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    action: formData.get("action"),
  })
  if (!parsed.success) return { status: "ERROR", message: "L’action demandée est invalide." }

  const [
    { revalidatePath },
    { revalidateGarageLive },
    { getPublicationWorkspaceSource },
    { PublicWebsiteProvider },
    { createClient },
    { PublicationExecutionEngine },
    { SupabasePublicationExecutionRepository },
  ] = await Promise.all([
    import("next/cache"),
    import("@/features/live-stock"),
    import("@/features/publication/repositories"),
    import("@/features/publication-targets"),
    import("@/lib/supabase/server"),
    import("../engines"),
    import("./supabase-publication-execution-repository"),
  ])
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: "ERROR", message: "Vous devez être connecté." }
  const source = await getPublicationWorkspaceSource(parsed.data.vehicleId)
  if (!source) return { status: "ERROR", message: "Véhicule introuvable ou inaccessible." }

  const result = await new PublicationExecutionEngine(
    new PublicWebsiteProvider(),
    new SupabasePublicationExecutionRepository()
  ).execute({ source, actorId: user.id, action: parsed.data.action })
  if (!result.success) return { status: "ERROR", message: result.message }

  revalidatePath(`/publication/${source.vehicle.id}`)
  revalidatePath(`/stock/${source.vehicle.id}`)
  revalidatePath("/stock")
  revalidatePath("/dashboard")
  revalidateGarageLive({
    garageSlug: source.garage.garageSlug,
    vehicleSlug: source.vehicle.slug,
  })
  return { status: "SUCCESS", message: result.message }
}

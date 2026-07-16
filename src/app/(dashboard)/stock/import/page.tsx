import { AcquisitionForm } from "@/features/acquisition/acquisition-form"
import { createClient } from "@/lib/supabase/server"

export default async function ImportVehiclePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: memberships } = user
    ? await supabase
        .from("garage_members")
        .select("garage_id")
        .eq("user_id", user.id)
    : { data: [] }
  const garageIds = memberships?.flatMap((membership) =>
    membership.garage_id ? [membership.garage_id] : []
  ) ?? []
  const { data: garages } = garageIds.length
    ? await supabase.from("garages").select("id, name").in("id", garageIds)
    : { data: [] }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Importer un véhicule</h1>
        <p className="mt-2 text-muted-foreground">
          Crée une fiche Stock à partir d&apos;une annonce Leboncoin.
        </p>
      </div>
      <AcquisitionForm garages={garages ?? []} />
    </div>
  )
}

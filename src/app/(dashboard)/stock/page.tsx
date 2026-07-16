import Link from "next/link"
import { Plus, Upload } from "lucide-react"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  StockVehicleList,
  type StockVehicle,
} from "@/features/vehicles/stock-vehicle-list"
import { createClient } from "@/lib/supabase/server"

export default async function StockPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/register")

  const { data: memberships, error: membershipError } = await supabase
    .from("garage_members")
    .select("garage_id")
    .eq("user_id", user.id)

  if (membershipError) {
    console.error("Unable to read current user garage memberships", {
      code: membershipError.code,
      message: membershipError.message,
    })
    throw new Error("Impossible de déterminer les garages accessibles.")
  }

  const garageIds = [
    ...new Set(
      (memberships ?? []).flatMap((membership) =>
        membership.garage_id ? [membership.garage_id] : []
      )
    ),
  ]
  if (garageIds.length === 0) {
    throw new Error("Aucun garage n'est associé à cet utilisateur.")
  }

  const { data: vehicleData, error: vehicleError } = await supabase
    .from("vehicles")
    .select(`
      id, brand, model, trim, year, mileage, status,
      purchase_price, selling_price,
      vehicle_costs (amount),
      vehicle_images (url, is_primary, created_at)
    `)
    .in("garage_id", garageIds)
    .order("created_at", { ascending: false })

  if (vehicleError) {
    console.error("Unable to read vehicles for accessible garages", {
      garageIds,
      code: vehicleError.code,
      message: vehicleError.message,
    })
    throw new Error("Impossible de charger le stock véhicules.")
  }

  const vehicles = (vehicleData ?? []) as StockVehicle[]

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stock véhicules</h1>
          <p className="mt-2 text-muted-foreground">
            Consultez et gérez les véhicules de votre garage.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild>
            <Link href="/stock/import">
              <Upload className="size-4" aria-hidden="true" />
              Importer une annonce
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/stock/new">
              <Plus className="size-4" aria-hidden="true" />
              Ajouter manuellement
            </Link>
          </Button>
        </div>
      </header>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Véhicules en stock
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {vehicles.length}
            </span>
          </h2>
        </div>

        {vehicles.length > 0 ? (
          <StockVehicleList vehicles={vehicles} />
        ) : (
          <div className="rounded-xl border border-dashed bg-white px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">Aucun véhicule dans le stock</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Importez une annonce ou ajoutez votre premier véhicule manuellement.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Button asChild>
                <Link href="/stock/import">Importer une annonce</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/stock/new">Ajouter manuellement</Link>
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

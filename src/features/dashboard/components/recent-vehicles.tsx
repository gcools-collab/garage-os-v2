import Link from "next/link"
import { Car } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardRecentVehicle } from "../types/dashboard"

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
})

export function RecentVehicles({ vehicles }: { vehicles: DashboardRecentVehicle[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        {vehicles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucun véhicule dans le stock pour le moment.
          </p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-5">
            {vehicles.map((vehicle) => (
              <li key={vehicle.id} className="overflow-hidden rounded-lg border">
                {vehicle.primaryImageUrl ? (
                  <div
                    role="img"
                    aria-label={vehicle.name}
                    className="aspect-[4/3] bg-muted bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${JSON.stringify(vehicle.primaryImageUrl)})`,
                    }}
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-muted">
                    <Car className="size-8 text-muted-foreground/60" aria-hidden="true" />
                  </div>
                )}
                <div className="space-y-3 p-3">
                  <div>
                    <p className="line-clamp-1 font-medium">{vehicle.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Ajouté le {dateFormatter.format(new Date(vehicle.createdAt))}
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/stock/${vehicle.id}`}>Voir</Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

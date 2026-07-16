import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { VehicleForm } from "@/features/vehicles/vehicle-form"

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Button asChild variant="ghost" className="-ml-2">
        <Link href="/stock">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Retour au stock
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Ajouter un véhicule manuellement</CardTitle>
          <p className="text-sm text-muted-foreground">
            Renseignez les informations du véhicule pour l&apos;ajouter à votre stock.
          </p>
        </CardHeader>
        <CardContent>
          <VehicleForm />
        </CardContent>
      </Card>
    </div>
  )
}

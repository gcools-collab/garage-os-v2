"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteVehicle } from "./actions"
import type { DeleteVehicleResult } from "./delete-state"

export function VehicleDeleteButton({
  vehicleId,
  vehicleName,
}: {
  vehicleId: string
  vehicleName: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<DeleteVehicleResult | null>(null)

  const handleDelete = () => {
    startTransition(async () => {
      const deletion = await deleteVehicle(vehicleId)
      setResult(deletion)
      if (deletion.success) setOpen(false)
    })
  }

  return (
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="text-destructive">
            <Trash2 className="size-4" aria-hidden="true" />
            Supprimer
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce véhicule ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera également les photos, coûts, événements et liens
              marketplace de {vehicleName}. Elle est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {result && !result.success && (
            <p className="text-sm text-destructive" role="alert">
              {result.message}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                handleDelete()
              }}
            >
              {pending ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {result?.success && result.warning && (
        <p className="mt-2 max-w-56 text-xs text-amber-700" role="status">
          {result.warning}
        </p>
      )}
    </div>
  )
}

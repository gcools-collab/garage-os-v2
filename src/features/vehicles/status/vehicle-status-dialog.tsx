"use client"

import { useState, useTransition } from "react"
import { RefreshCw } from "lucide-react"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateVehicleStatus, type VehicleStatusActionResult } from "./vehicle-status-actions"
import { getAllowedVehicleStatusTransitions } from "./vehicle-status-transitions"
import {
  getVehicleStatusLabel,
  type VehicleStatus,
} from "./vehicle-status"

export function VehicleStatusDialog({
  vehicleId,
  currentStatus,
}: {
  vehicleId: string
  currentStatus: VehicleStatus
}) {
  const allowedStatuses = getAllowedVehicleStatusTransitions(currentStatus)
  const [open, setOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState<VehicleStatus | null>(null)
  const [result, setResult] = useState<VehicleStatusActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={allowedStatuses.length === 0}>
          <RefreshCw aria-hidden="true" />Changer le statut
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Changer le statut du véhicule</AlertDialogTitle>
          <AlertDialogDescription>
            Statut actuel : <strong>{getVehicleStatusLabel(currentStatus)}</strong>. Sélectionnez une transition autorisée puis confirmez.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Select
          value={nextStatus ?? undefined}
          disabled={pending}
          onValueChange={(value) => {
            setNextStatus(value as VehicleStatus)
            setResult(null)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Sélectionner le nouveau statut" />
          </SelectTrigger>
          <SelectContent>
            {allowedStatuses.map((status) => (
              <SelectItem key={status} value={status}>{getVehicleStatusLabel(status)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {result && !result.success && <p className="text-sm text-destructive" role="alert">{result.message}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending || !nextStatus}
            onClick={(event) => {
              event.preventDefault()
              if (!nextStatus) return
              startTransition(async () => {
                const update = await updateVehicleStatus(vehicleId, nextStatus)
                setResult(update)
                if (update.success) setOpen(false)
              })
            }}
          >
            {pending ? "Mise à jour..." : "Confirmer le changement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

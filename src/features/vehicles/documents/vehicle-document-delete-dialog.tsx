"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { deleteVehicleDocument } from "./vehicle-document-actions"

export function VehicleDocumentDeleteDialog({ documentId, vehicleId, label }: { documentId: string; vehicleId: string; label: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string>()
  return <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon-sm" className="text-destructive"><Trash2 /><span className="sr-only">Supprimer {label}</span></Button></AlertDialogTrigger><AlertDialogContent>
    <AlertDialogHeader><AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle><AlertDialogDescription>« {label} » et son fichier seront définitivement supprimés.</AlertDialogDescription></AlertDialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<AlertDialogFooter><AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel><AlertDialogAction disabled={pending} onClick={(event) => { event.preventDefault(); startTransition(async () => { const result = await deleteVehicleDocument(documentId, vehicleId); if (!result.success) setError(result.message) }) }}>{pending ? "Suppression..." : "Supprimer définitivement"}</AlertDialogAction></AlertDialogFooter>
  </AlertDialogContent></AlertDialog>
}

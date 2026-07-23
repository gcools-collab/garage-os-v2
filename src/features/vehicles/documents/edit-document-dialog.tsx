"use client"

import { useActionState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DocumentFormFields } from "./document-form-fields"
import { updateVehicleDocument } from "./vehicle-document-actions"
import { initialVehicleDocumentActionState, type VehicleDocument } from "./types"

export function EditDocumentDialog({ document }: { document: VehicleDocument }) {
  const [state, action, pending] = useActionState(updateVehicleDocument.bind(null, document.id, document.vehicle_id), initialVehicleDocumentActionState)
  return <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon-sm"><Pencil /><span className="sr-only">Modifier {document.label}</span></Button></DialogTrigger><DialogContent>
    <DialogHeader><DialogTitle>Modifier le document</DialogTitle><DialogDescription>Le fichier original reste inchangé.</DialogDescription></DialogHeader>
    <form action={action} className="space-y-5"><fieldset disabled={pending}><DocumentFormFields state={state} category={document.category} label={document.label} /></fieldset>{state.message && <p role="status" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p>}<Button type="submit" disabled={pending}>{pending ? "Enregistrement..." : "Enregistrer"}</Button></form>
  </DialogContent></Dialog>
}

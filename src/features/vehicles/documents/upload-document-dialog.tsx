"use client"

import { useActionState } from "react"
import { FilePlus2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { addVehicleDocument } from "./vehicle-document-actions"
import { DocumentFormFields } from "./document-form-fields"
import { initialVehicleDocumentActionState } from "./types"

export function UploadDocumentDialog({ vehicleId }: { vehicleId: string }) {
  const [state, action, pending] = useActionState(addVehicleDocument.bind(null, vehicleId), initialVehicleDocumentActionState)
  return <Dialog><DialogTrigger asChild><Button><FilePlus2 />Ajouter un document</Button></DialogTrigger><DialogContent>
    <DialogHeader><DialogTitle>Ajouter un document</DialogTitle><DialogDescription>Le fichier sera conservé dans l’espace privé de ce véhicule.</DialogDescription></DialogHeader>
    <form action={action} className="space-y-5"><fieldset disabled={pending}><DocumentFormFields state={state} includeFile /></fieldset>{state.message && <p role="status" className={state.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{state.message}</p>}<Button type="submit" disabled={pending}>{pending ? "Téléversement..." : "Ajouter le document"}</Button></form>
  </DialogContent></Dialog>
}

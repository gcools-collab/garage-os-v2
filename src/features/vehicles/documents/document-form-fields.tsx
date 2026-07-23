"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { MAX_DOCUMENT_FILE_SIZE, validateDocumentFile } from "./document-validation"
import { vehicleDocumentCategories, vehicleDocumentCategoryDefinitions, type VehicleDocumentCategory } from "./document-categories"
import type { VehicleDocumentActionState } from "./types"

export function DocumentFormFields({ state, category, label, includeFile = false }: {
  state: VehicleDocumentActionState
  category?: VehicleDocumentCategory
  label?: string
  includeFile?: boolean
}) {
  const [clientFileError, setClientFileError] = useState<string>()
  return <div className="grid gap-4">
    {includeFile && <div className="space-y-2"><label htmlFor="document-file" className="text-sm font-medium">Fichier</label><Input id="document-file" name="file" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required onChange={(event) => { const file = event.currentTarget.files?.[0]; const error = file ? validateDocumentFile(file) : "Sélectionnez un fichier."; event.currentTarget.setCustomValidity(error ?? ""); setClientFileError(error ?? undefined) }} /><p className="text-xs text-muted-foreground">PDF, JPEG, PNG ou WebP · {MAX_DOCUMENT_FILE_SIZE / 1024 / 1024} Mo maximum.</p>{(clientFileError ?? state.errors?.file?.[0]) && <p className="text-sm text-destructive">{clientFileError ?? state.errors?.file?.[0]}</p>}</div>}
    <div className="space-y-2"><label htmlFor={`document-category-${includeFile ? "new" : "edit"}`} className="text-sm font-medium">Catégorie</label><select id={`document-category-${includeFile ? "new" : "edit"}`} name="category" defaultValue={category ?? "other"} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs" required>{vehicleDocumentCategories.map((value) => <option key={value} value={value}>{vehicleDocumentCategoryDefinitions[value].label}</option>)}</select>{state.errors?.category?.[0] && <p className="text-sm text-destructive">{state.errors.category[0]}</p>}</div>
    <div className="space-y-2"><label htmlFor={`document-label-${includeFile ? "new" : "edit"}`} className="text-sm font-medium">Libellé</label><Input id={`document-label-${includeFile ? "new" : "edit"}`} name="label" defaultValue={label ?? ""} maxLength={120} placeholder="Ex. Carte grise originale" required />{state.errors?.label?.[0] && <p className="text-sm text-destructive">{state.errors.label[0]}</p>}</div>
  </div>
}

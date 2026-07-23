import { AlertTriangle, CheckCircle2, Files } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { calculateVehicleDocumentSummary } from "./vehicle-document-service"
import { vehicleDocumentCategoryDefinitions } from "./document-categories"
import { UploadDocumentDialog } from "./upload-document-dialog"
import { VehicleDocumentList } from "./vehicle-document-list"
import type { VehicleDocument } from "./types"

export function VehicleDocumentsSection({ vehicleId, documents }: { vehicleId: string; documents: VehicleDocument[] }) {
  const sorted = [...documents].sort((a, b) => b.created_at.localeCompare(a.created_at))
  const summary = calculateVehicleDocumentSummary(sorted)
  return <section id="vehicle-documents" className="scroll-mt-6 rounded-xl border bg-white p-5 shadow-xs sm:p-6"><div className="mb-6 flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><Files className="size-5" /><h2 className="text-xl font-semibold">Documents</h2></div><p className="mt-1 text-sm text-muted-foreground">{summary.total} document{summary.total > 1 ? "s" : ""} · complétude documentaire {summary.completenessPercentage} %</p><div className="mt-3 flex flex-wrap gap-2">{summary.presentCategories.map((category) => <Badge key={category} variant="secondary">{vehicleDocumentCategoryDefinitions[category].label}</Badge>)}</div></div><UploadDocumentDialog vehicleId={vehicleId} /></div>
    <div className="mb-5 rounded-lg bg-muted/30 p-4"><h3 className="text-sm font-semibold">Documents administratifs importants</h3>{summary.missingImportantCategories.length === 0 ? <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="size-4" />Tous les documents importants sont présents.</p> : <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-3">{summary.missingImportantCategories.map((category) => <li key={category} className="flex items-center gap-2 text-orange-700"><AlertTriangle className="size-4" />{vehicleDocumentCategoryDefinitions[category].label} manquant{category === "purchase_invoice" ? "e" : ""}</li>)}</ul>}</div>
    <VehicleDocumentList documents={sorted} />
  </section>
}

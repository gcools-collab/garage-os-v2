import type { VehicleDocument } from "./types"
import { VehicleDocumentCard } from "./vehicle-document-card"

export function VehicleDocumentList({ documents }: { documents: VehicleDocument[] }) {
  if (documents.length === 0) return <div className="rounded-xl border border-dashed px-5 py-10 text-center"><p className="font-medium">Aucun document enregistré pour ce véhicule.</p><p className="mt-1 text-sm text-muted-foreground">Centralisez ici les documents administratifs, factures et contrôles du véhicule.</p></div>
  return <div className="grid gap-3 lg:grid-cols-2">{documents.map((document) => <VehicleDocumentCard key={document.id} document={document} />)}</div>
}

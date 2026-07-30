import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createAcquisitionOpportunity } from "@/features/acquisition/actions/opportunity-actions"
import { OpportunityForm } from "@/features/acquisition/components"

export default function NewAcquisitionOpportunityPage() {
  return <main className="space-y-6">
    <Button variant="ghost" asChild><Link href="/acquisition"><ArrowLeft />Retour</Link></Button>
    <header><h1 className="text-3xl font-bold">Nouvelle opportunité</h1><p className="mt-1 text-muted-foreground">Centralisez les informations disponibles sans créer de véhicule en stock.</p></header>
    <OpportunityForm action={createAcquisitionOpportunity} />
  </main>
}

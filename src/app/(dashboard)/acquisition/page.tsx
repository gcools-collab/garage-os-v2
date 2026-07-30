import Link from "next/link"
import { Plus } from "lucide-react"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { buildAcquisitionListItem } from "@/features/acquisition/builders"
import { OpportunityList } from "@/features/acquisition/components"
import { listAcquisitionOpportunities } from "@/features/acquisition/repositories"
import { getActiveGarageSession } from "@/features/tenant"

export default async function AcquisitionPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")
  const opportunities = await listAcquisitionOpportunities(session)
  return <main className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold">Acquisition</h1><p className="mt-1 text-muted-foreground">Étudiez les propositions reçues avant leur entrée en stock.</p></div>
      <Button asChild><Link href="/acquisition/new"><Plus />Nouvelle opportunité</Link></Button>
    </header>
    <OpportunityList items={opportunities.map(buildAcquisitionListItem)} />
  </main>
}

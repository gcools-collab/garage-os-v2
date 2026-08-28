import { redirect } from "next/navigation"
import Link from "next/link"
import { ElectronicInvoiceSettingsPanel, getElectronicInvoiceSettingsView } from "@/features/billing"
import { getActiveGarageSession } from "@/features/tenant"

export default async function ElectronicInvoicingSettingsPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const view = await getElectronicInvoiceSettingsView(session.garageId)

  return (
    <main className="space-y-6">
      <Link href="/settings" className="text-sm underline">Retour aux paramètres</Link>
      <header>
        <h1 className="text-3xl font-semibold">Facturation électronique</h1>
        <p className="mt-2 text-muted-foreground">Configuration PA et préparation réglementaire — sans stocker de secrets.</p>
      </header>
      <ElectronicInvoiceSettingsPanel
        settings={view.settings}
        connectionStatus={view.connection.connectionStatus}
        connectionMessages={view.connection.messages}
      />
    </main>
  )
}

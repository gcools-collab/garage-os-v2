import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Paramètres</h1>
      <p className="text-muted-foreground">Gérez la configuration de votre garage.</p>
      <div className="flex flex-wrap gap-3">
        <Button asChild><Link href="/settings/branding">Identité du garage</Link></Button>
        <Button variant="outline" asChild><Link href="/settings/services">Services publics</Link></Button>
        <Button variant="outline" asChild><Link href="/settings/appointments">Rendez-vous en ligne</Link></Button>
        <Button variant="outline" asChild><Link href="/settings/billing/e-invoicing">Facturation électronique</Link></Button>
      </div>
    </div>
  )
}

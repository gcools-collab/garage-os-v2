import { redirect } from "next/navigation"
import Link from "next/link"
import { getActiveGarageSession } from "@/features/tenant"

export default async function BillingPage() {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Facturation</h1>
        <p className="mt-2 text-muted-foreground">Devis, factures et avoirs pour votre garage.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/billing/quotes" className="rounded-xl border bg-white p-6 transition hover:border-primary/40">
          <h2 className="text-xl font-semibold">Devis</h2>
          <p className="mt-2 text-sm text-muted-foreground">Propositions commerciales et conversions.</p>
        </Link>
        <Link href="/billing/invoices" className="rounded-xl border bg-white p-6 transition hover:border-primary/40">
          <h2 className="text-xl font-semibold">Factures</h2>
          <p className="mt-2 text-sm text-muted-foreground">Émission, paiements et soldes.</p>
        </Link>
        <Link href="/billing/credit-notes" className="rounded-xl border bg-white p-6 transition hover:border-primary/40">
          <h2 className="text-xl font-semibold">Avoirs</h2>
          <p className="mt-2 text-sm text-muted-foreground">Corrections sans modifier la facture d&apos;origine.</p>
        </Link>
      </div>
    </main>
  )
}

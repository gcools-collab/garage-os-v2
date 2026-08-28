import Link from "next/link"
import { redirect } from "next/navigation"

import { createCustomerAction, CustomerForm } from "@/features/customers"
import { getActiveGarageSession } from "@/features/tenant"

type NewCustomerPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewCustomerPage({ searchParams }: NewCustomerPageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")

  const query = await searchParams
  const error = Array.isArray(query.error) ? query.error[0] : query.error

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/customers" className="text-sm underline">Retour aux clients</Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Nouveau client</h1>
        <p className="mt-2 text-muted-foreground">Créez une fiche client sans fusion automatique.</p>
      </header>
      {error === "identity" ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          Renseignez au minimum un nom, un e-mail ou un téléphone.
        </p>
      ) : null}
      {error === "save" ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          Enregistrement impossible. Vérifiez les informations saisies.
        </p>
      ) : null}
      <CustomerForm action={createCustomerAction} submitLabel="Créer le client" />
    </div>
  )
}

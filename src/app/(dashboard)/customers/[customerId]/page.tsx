import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import {
  buildCustomerDetailViewModel,
  createCustomerLeadAction,
  Customer360View,
  CustomerLeadForm,
  CustomerVehicleForm,
  getCustomer360Bundle,
  upsertCustomerVehicleAction,
} from "@/features/customers"
import { getActiveGarageSession } from "@/features/tenant"

type CustomerDetailPageProps = {
  params: Promise<{ customerId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CustomerDetailPage({ params, searchParams }: CustomerDetailPageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")

  const { customerId } = await params
  const bundle = await getCustomer360Bundle(session, customerId)
  if (!bundle) notFound()

  const view = buildCustomerDetailViewModel(bundle)
  const query = await searchParams
  const warning = Array.isArray(query.warning) ? query.warning[0] : query.warning

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/customers" className="text-sm underline">Retour aux clients</Link>

      {warning === "duplicate" ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Un autre client partage le même e-mail ou téléphone. Aucune fusion automatique n’a été effectuée.
        </p>
      ) : null}

      <Customer360View view={view} />

      <section id="create-lead" className="scroll-mt-6 space-y-4">
        <header>
          <h2 className="text-xl font-semibold">Nouvelle demande commerciale</h2>
          <p className="text-sm text-muted-foreground">Crée une demande liée à {view.name}.</p>
        </header>
        <CustomerLeadForm action={createCustomerLeadAction} customerId={view.id} />
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold">Ajouter un véhicule client</h2>
          <p className="text-sm text-muted-foreground">Associe un véhicule au parc du client. Le lien stock reste explicite.</p>
        </header>
        <CustomerVehicleForm action={upsertCustomerVehicleAction} customerId={view.id} />
      </section>
    </div>
  )
}

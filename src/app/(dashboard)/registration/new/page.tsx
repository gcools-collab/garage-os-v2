import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { formatCustomerName, getCustomerById } from "@/features/customers"
import { createStaffRegistrationCase, getRegistrationProcedures, StaffRegistrationCaseForm } from "@/features/registration"
import { getActiveGarageSession } from "@/features/tenant"

type NewRegistrationCasePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewRegistrationCasePage({ searchParams }: NewRegistrationCasePageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")

  const params = await searchParams
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId
  const appointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId

  if (!customerId || !/^[0-9a-f-]{36}$/i.test(customerId)) redirect("/customers")

  const customer = await getCustomerById(session, customerId)
  if (!customer) notFound()

  const procedures = await getRegistrationProcedures(session.garageId)
  const activeProcedures = procedures.filter((item) => item.is_active)
  if (activeProcedures.length === 0) {
    return (
      <main className="mx-auto max-w-3xl space-y-6">
        <Link href={`/customers/${customerId}`} className="text-sm underline">Retour à la fiche client</Link>
        <p className="rounded-xl border bg-white p-6 text-muted-foreground">
          Aucune démarche carte grise active. Configurez les procédures dans Paramètres → Services → Carte grise.
        </p>
      </main>
    )
  }

  const customerName = formatCustomerName(customer.first_name, customer.last_name)

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <Link href={`/customers/${customerId}`} className="text-sm underline">Retour à la fiche client</Link>
      <header>
        <h1 className="text-3xl font-semibold">Nouveau dossier carte grise</h1>
        <p className="mt-2 text-muted-foreground">
          Créez un dossier pour {customerName} sans rendez-vous préalable si nécessaire.
        </p>
      </header>
      <StaffRegistrationCaseForm
        action={createStaffRegistrationCase}
        customerId={customerId}
        customerName={customerName}
        appointmentId={appointmentId}
        cancelHref={`/customers/${customerId}`}
      />
    </main>
  )
}

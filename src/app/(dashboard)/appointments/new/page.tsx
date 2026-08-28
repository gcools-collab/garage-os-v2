import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { createStaffAppointment, StaffAppointmentForm } from "@/features/scheduling"
import { formatCustomerName, getCustomerById } from "@/features/customers"
import { getActiveGarageSession } from "@/features/tenant"

type NewAppointmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function NewAppointmentPage({ searchParams }: NewAppointmentPageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")

  const params = await searchParams
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId
  if (!customerId || !/^[0-9a-f-]{36}$/i.test(customerId)) redirect("/customers")

  const customer = await getCustomerById(session, customerId)
  if (!customer) notFound()

  const customerName = formatCustomerName(customer.first_name, customer.last_name)

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <Link href={`/customers/${customerId}`} className="text-sm underline">Retour à la fiche client</Link>
      <header>
        <h1 className="text-3xl font-semibold">Nouveau rendez-vous</h1>
        <p className="mt-2 text-muted-foreground">Planifiez une prestation pour {customerName}.</p>
      </header>
      <StaffAppointmentForm
        action={createStaffAppointment}
        customerId={customerId}
        customerName={customerName}
        cancelHref={`/customers/${customerId}`}
      />
    </main>
  )
}

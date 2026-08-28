import Link from "next/link"
import { notFound, redirect } from "next/navigation"

import { CustomerForm, getCustomerById, updateCustomerAction } from "@/features/customers"
import { getActiveGarageSession } from "@/features/tenant"

export default async function EditCustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/select-garage")

  const { customerId } = await params
  const customer = await getCustomerById(session, customerId)
  if (!customer) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/customers/${customerId}`} className="text-sm underline">Retour à la fiche client</Link>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Modifier le client</h1>
      </header>
      <CustomerForm action={updateCustomerAction} customer={customer} customerId={customerId} submitLabel="Enregistrer" />
    </div>
  )
}

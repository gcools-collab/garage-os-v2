import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CreateBillingDocumentForm } from "@/features/billing"
import { formatCustomerName, getCustomerById } from "@/features/customers"
import { getActiveGarageSession } from "@/features/tenant"

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const params = await searchParams
  const customerId = Array.isArray(params.customerId) ? params.customerId[0] : params.customerId
  const registrationCaseId = Array.isArray(params.registrationCaseId) ? params.registrationCaseId[0] : params.registrationCaseId
  if (!customerId || !/^[0-9a-f-]{36}$/i.test(customerId)) redirect("/customers")

  const customer = await getCustomerById(session, customerId)
  if (!customer) notFound()

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <Link href={`/customers/${customerId}`} className="text-sm underline">Retour à la fiche client</Link>
      <CreateBillingDocumentForm
        documentType="INVOICE"
        customerId={customerId}
        customerName={formatCustomerName(customer.first_name, customer.last_name)}
        cancelHref={`/customers/${customerId}`}
        registrationCaseId={registrationCaseId}
      />
    </main>
  )
}

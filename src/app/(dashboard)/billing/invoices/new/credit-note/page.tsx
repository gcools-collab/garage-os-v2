import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CreateBillingDocumentForm } from "@/features/billing"
import { formatCustomerName, getCustomerById } from "@/features/customers"
import { getBillingDocumentBundle } from "@/features/billing/repositories/billing-repository"
import { getActiveGarageSession } from "@/features/tenant"

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function NewCreditNotePage({ searchParams }: PageProps) {
  const session = await getActiveGarageSession()
  if (!session?.garageId) redirect("/login")

  const params = await searchParams
  const invoiceId = Array.isArray(params.invoiceId) ? params.invoiceId[0] : params.invoiceId
  if (!invoiceId || !/^[0-9a-f-]{36}$/i.test(invoiceId)) redirect("/billing/invoices")

  const invoiceBundle = await getBillingDocumentBundle(session, invoiceId)
  if (!invoiceBundle || invoiceBundle.document.document_type !== "INVOICE") notFound()
  if (!["ISSUED", "PARTIALLY_PAID", "PAID"].includes(invoiceBundle.document.status)) redirect(`/billing/invoices/${invoiceId}`)

  const customer = await getCustomerById(session, invoiceBundle.document.customer_id)
  if (!customer) notFound()

  return (
    <main className="mx-auto max-w-3xl space-y-6">
      <Link href={`/billing/invoices/${invoiceId}`} className="text-sm underline">Retour à la facture</Link>
      <CreateBillingDocumentForm
        documentType="CREDIT_NOTE"
        customerId={customer.id}
        customerName={formatCustomerName(customer.first_name, customer.last_name)}
        cancelHref={`/billing/invoices/${invoiceId}`}
        sourceInvoiceId={invoiceId}
      />
    </main>
  )
}

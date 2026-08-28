import Link from "next/link"
import { createBillingDocumentDraft } from "../actions/billing-actions"

type CreateBillingDocumentFormProps = {
  readonly documentType: "QUOTE" | "INVOICE" | "CREDIT_NOTE"
  readonly customerId: string
  readonly customerName: string
  readonly cancelHref: string
  readonly sourceInvoiceId?: string
  readonly registrationCaseId?: string
}

const labels = {
  QUOTE: { title: "Nouveau devis", submit: "Créer le devis" },
  INVOICE: { title: "Nouvelle facture", submit: "Créer la facture" },
  CREDIT_NOTE: { title: "Nouvel avoir", submit: "Créer l'avoir" },
} as const

export function CreateBillingDocumentForm({
  documentType,
  customerId,
  customerName,
  cancelHref,
  sourceInvoiceId,
  registrationCaseId,
}: CreateBillingDocumentFormProps) {
  const copy = labels[documentType]

  return (
    <form action={createBillingDocumentDraft} className="grid max-w-2xl gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <input type="hidden" name="documentType" value={documentType} />
      <input type="hidden" name="customerId" value={customerId} />
      {sourceInvoiceId ? <input type="hidden" name="sourceInvoiceId" value={sourceInvoiceId} /> : null}
      {registrationCaseId ? <input type="hidden" name="registrationCaseId" value={registrationCaseId} /> : null}

      <div>
        <h1 className="text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Client : <strong>{customerName}</strong></p>
      </div>

      {documentType === "QUOTE" ? (
        <label className="grid gap-2 text-sm">
          Validité jusqu&apos;au
          <input name="validUntil" type="date" className="min-h-11 rounded-md border px-3" />
        </label>
      ) : null}

      <label className="grid gap-2 text-sm">
        Notes internes
        <textarea name="notes" rows={3} className="rounded-md border px-3 py-2" />
      </label>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">{copy.submit}</button>
        <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">Annuler</Link>
      </div>
    </form>
  )
}

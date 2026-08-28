import Link from "next/link"
import {
  addServiceOfferLine,
  finalizeBillingDocument,
  recordInvoicePayment,
  removeBillingDocumentLine,
  saveBillingDocumentLine,
} from "../actions/billing-actions"
import type { BillingDetailViewModel } from "../builders/billing-view-models"

type ServiceOfferOption = Readonly<{ id: string; name: string; amountLabel: string }>

type BillingDocumentDetailProps = {
  readonly viewModel: BillingDetailViewModel
  readonly serviceOffers: readonly ServiceOfferOption[]
  readonly convertAction?: (formData: FormData) => void | Promise<void>
}

export function BillingDocumentDetail({
  viewModel,
  serviceOffers,
  convertAction,
}: BillingDocumentDetailProps) {
  const vm = viewModel

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">{vm.documentTypeLabel}</p>
          <h1 className="text-3xl font-semibold">{vm.documentNumber}</h1>
          <p className="mt-2 text-muted-foreground">
            {vm.customerHref ? (
              <Link href={vm.customerHref} className="underline-offset-4 hover:underline">{vm.customerLabel}</Link>
            ) : vm.customerLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex min-h-9 items-center rounded-full bg-muted px-3 text-sm font-medium">{vm.statusLabel}</span>
          <Link href={`/api/billing/${vm.id}/pdf`} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm" target="_blank">
            Télécharger PDF
          </Link>
        </div>
      </header>

      {vm.issuerWarnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {vm.issuerWarnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-xl border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Total HT" value={vm.subtotalLabel} />
        <Metric label="TVA" value={vm.vatLabel} />
        <Metric label="Total TTC" value={vm.totalLabel} />
        {vm.remainingLabel ? <Metric label="Reste dû" value={vm.remainingLabel} highlight /> : null}
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Lignes</h2>
        <div className="mt-4 space-y-3">
          {vm.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune ligne.</p>
          ) : vm.lines.map((line) => (
            <div key={line.id} className="flex flex-col gap-2 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{line.description}</p>
                <p className="text-sm text-muted-foreground">
                  {line.quantity} {line.unit} × {line.unitPriceLabel} HT · TVA {line.vatRateLabel}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">{line.lineTotalLabel}</p>
                {vm.editable ? (
                  <form action={removeBillingDocumentLine}>
                    <input type="hidden" name="documentId" value={vm.id} />
                    <input type="hidden" name="lineId" value={line.id} />
                    <button type="submit" className="text-sm text-destructive">Supprimer</button>
                  </form>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {vm.editable ? (
          <div className="mt-6 grid gap-4 border-t pt-4">
            <h3 className="font-medium">Ajouter une ligne</h3>
            <form action={saveBillingDocumentLine} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="documentId" value={vm.id} />
              <input type="hidden" name="lineOrder" value={vm.lines.length} />
              <label className="grid gap-1 text-sm sm:col-span-2">
                Description
                <input name="description" required className="min-h-11 rounded-md border px-3" />
              </label>
              <label className="grid gap-1 text-sm">
                Quantité
                <input name="quantity" type="number" min={1} defaultValue={1} required className="min-h-11 rounded-md border px-3" />
              </label>
              <label className="grid gap-1 text-sm">
                Prix unitaire HT (€)
                <input name="unitPrice" required placeholder="120,00" className="min-h-11 rounded-md border px-3" />
              </label>
              <label className="grid gap-1 text-sm">
                TVA (%)
                <input name="vatRatePercent" type="number" min={0} max={100} step={0.1} defaultValue={20} className="min-h-11 rounded-md border px-3" />
              </label>
              <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground sm:col-span-2 sm:w-fit">
                Ajouter la ligne
              </button>
            </form>

            {serviceOffers.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium">Depuis le catalogue services</p>
                <div className="flex flex-wrap gap-2">
                  {serviceOffers.map((offer) => (
                    <form key={offer.id} action={addServiceOfferLine}>
                      <input type="hidden" name="documentId" value={vm.id} />
                      <input type="hidden" name="offerId" value={offer.id} />
                      <button type="submit" className="min-h-10 rounded-md border px-3 text-sm">
                        {offer.name} · {offer.amountLabel}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="flex flex-wrap gap-3">
        {vm.documentType === "QUOTE" && vm.statusLabel === "Brouillon" ? (
          <form action={finalizeBillingDocument}>
            <input type="hidden" name="documentId" value={vm.id} />
            <input type="hidden" name="action" value="SEND_QUOTE" />
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">Marquer comme envoyé</button>
          </form>
        ) : null}
        {vm.documentType === "QUOTE" && vm.statusLabel === "Envoyé" ? (
          <>
            <form action={finalizeBillingDocument}>
              <input type="hidden" name="documentId" value={vm.id} />
              <input type="hidden" name="action" value="ACCEPT_QUOTE" />
              <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">Accepter le devis</button>
            </form>
            <form action={finalizeBillingDocument}>
              <input type="hidden" name="documentId" value={vm.id} />
              <input type="hidden" name="action" value="DECLINE_QUOTE" />
              <button type="submit" className="min-h-11 rounded-md border px-4">Refuser</button>
            </form>
          </>
        ) : null}
        {vm.documentType === "QUOTE" && vm.statusLabel === "Accepté" && convertAction ? (
          <form action={convertAction}>
            <input type="hidden" name="quoteId" value={vm.id} />
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">Convertir en facture</button>
          </form>
        ) : null}
        {vm.documentType === "INVOICE" && vm.statusLabel === "Brouillon" ? (
          <form action={finalizeBillingDocument}>
            <input type="hidden" name="documentId" value={vm.id} />
            <input type="hidden" name="action" value="ISSUE_INVOICE" />
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">Émettre la facture</button>
          </form>
        ) : null}
        {vm.documentType === "CREDIT_NOTE" && vm.statusLabel === "Brouillon" ? (
          <form action={finalizeBillingDocument}>
            <input type="hidden" name="documentId" value={vm.id} />
            <input type="hidden" name="action" value="ISSUE_CREDIT_NOTE" />
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">Émettre l&apos;avoir</button>
          </form>
        ) : null}
      </section>

      {vm.documentType === "INVOICE" && ["Émise", "Partiellement payée"].includes(vm.statusLabel) ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Enregistrer un paiement</h2>
          <form action={recordInvoicePayment} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
            <input type="hidden" name="invoiceId" value={vm.id} />
            <label className="grid gap-1 text-sm">
              Montant (€)
              <input name="amount" required placeholder="100,00" className="min-h-11 rounded-md border px-3" />
            </label>
            <label className="grid gap-1 text-sm">
              Mode
              <select name="paymentMethod" className="min-h-11 rounded-md border px-3">
                <option value="BANK_TRANSFER">Virement</option>
                <option value="CARD">Carte</option>
                <option value="CHECK">Chèque</option>
                <option value="CASH">Espèces</option>
                <option value="OTHER">Autre</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm sm:col-span-2">
              Référence
              <input name="reference" className="min-h-11 rounded-md border px-3" />
            </label>
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground sm:col-span-2 sm:w-fit">
              Enregistrer le paiement
            </button>
          </form>
        </section>
      ) : null}

      {vm.payments.length > 0 ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Paiements enregistrés</h2>
          <ul className="mt-3 space-y-2">
            {vm.payments.map((payment) => (
              <li key={payment.id} className="flex justify-between text-sm">
                <span>{payment.methodLabel} · {payment.dateLabel}{payment.reference ? ` · ${payment.reference}` : ""}</span>
                <span className="font-medium">{payment.amountLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(vm.linkedQuoteHref || vm.linkedInvoiceHref || vm.convertedInvoiceHref) ? (
        <section className="rounded-xl border bg-white p-4 text-sm">
          <h2 className="font-semibold">Documents liés</h2>
          <ul className="mt-2 space-y-1">
            {vm.linkedQuoteHref ? <li><Link href={vm.linkedQuoteHref} className="underline">Devis source</Link></li> : null}
            {vm.convertedInvoiceHref ? <li><Link href={vm.convertedInvoiceHref} className="underline">Facture générée</Link></li> : null}
            {vm.linkedInvoiceHref ? <li><Link href={vm.linkedInvoiceHref} className="underline">Facture d&apos;origine</Link></li> : null}
            {vm.creditNoteHrefs.map((item) => (
              <li key={item.id}><Link href={item.href} className="underline">{item.label}</Link></li>
            ))}
          </ul>
        </section>
      ) : null}

      {vm.events.length > 0 ? (
        <section className="rounded-xl border bg-white p-4">
          <h2 className="text-lg font-semibold">Historique</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {vm.events.map((event) => (
              <li key={event.id}>{event.dateLabel} — {event.label}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function Metric({ label, value, highlight = false }: { readonly label: string; readonly value: string; readonly highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={highlight ? "text-lg font-semibold text-amber-700" : "text-lg font-semibold"}>{value}</p>
    </div>
  )
}

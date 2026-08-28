import { refreshElectronicInvoiceStatus, submitElectronicInvoice } from "../actions/e-invoicing-actions"
import type { ElectronicInvoiceSectionViewModel } from "../builders/e-invoicing-view-models"

type ElectronicInvoiceSectionProps = {
  readonly invoiceId: string
  readonly viewModel: ElectronicInvoiceSectionViewModel
}

export function ElectronicInvoiceSection({ invoiceId, viewModel }: ElectronicInvoiceSectionProps) {
  const vm = viewModel

  return (
    <section className="rounded-xl border bg-white p-4 sm:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Facturation électronique</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Transmission réglementaire via plateforme agréée — distincte du statut de paiement ({vm.businessStatusLabel}).
          </p>
        </div>
        <span className="inline-flex min-h-9 items-center rounded-full bg-muted px-3 text-sm font-medium">
          {vm.statusLabel}
        </span>
      </header>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Contexte client</dt><dd className="font-medium">{vm.recipientContextLabel}</dd></div>
        <div><dt className="text-muted-foreground">Route réglementaire</dt><dd className="font-medium">{vm.regulatoryRouteLabel}</dd></div>
        <div><dt className="text-muted-foreground">Fournisseur PA</dt><dd className="font-medium">{vm.providerName}</dd></div>
        <div><dt className="text-muted-foreground">Mode</dt><dd className="font-medium">{vm.providerMode}</dd></div>
        <div><dt className="text-muted-foreground">Connexion</dt><dd className="font-medium">{vm.connectionStatus}</dd></div>
        {vm.providerReference ? (
          <div className="sm:col-span-2"><dt className="text-muted-foreground">Référence PA</dt><dd className="break-all font-medium">{vm.providerReference}</dd></div>
        ) : null}
      </dl>

      {vm.showConfigurationRequired ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Configuration requise</p>
          <ul className="mt-2 list-disc pl-5">
            {vm.connectionMessages.map((message) => <li key={message}>{message}</li>)}
          </ul>
          <p className="mt-2">Les clés API restent côté serveur — jamais stockées en base.</p>
        </div>
      ) : null}

      {!vm.paTransmissionEligible ? (
        <div className="mt-4 rounded-lg border p-4 text-sm text-muted-foreground">
          Ce document n&apos;est pas éligible à une transmission PA B2B (e-reporting ou autre flux applicable).
        </div>
      ) : null}

      {vm.readinessWarnings.length > 0 ? (
        <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
          {vm.readinessWarnings.map((warning) => <li key={warning}>• {warning}</li>)}
        </ul>
      ) : null}

      {(vm.readinessErrors.length > 0 || vm.submissionErrors.length > 0) ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-medium">Blocages</p>
          <ul className="mt-2 list-disc pl-5">
            {[...vm.readinessErrors, ...vm.submissionErrors].map((message) => <li key={message}>{message}</li>)}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {vm.canSubmit ? (
          <form action={submitElectronicInvoice}>
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
              Transmettre via PA (sandbox)
            </button>
          </form>
        ) : null}
        {vm.canRefresh ? (
          <form action={refreshElectronicInvoiceStatus}>
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <button type="submit" className="min-h-11 rounded-md border px-4 text-sm">
              Actualiser le statut PA
            </button>
          </form>
        ) : null}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Le PDF Garage OS n&apos;est pas une facture électronique conforme. La conformité réglementaire dépend de la PA configurée.
      </p>
    </section>
  )
}

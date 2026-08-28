import { saveElectronicInvoiceSettings } from "../actions/e-invoicing-actions"
import type { GarageElectronicInvoiceSettingsRecord } from "../types/e-invoicing"

type ElectronicInvoiceSettingsPanelProps = {
  readonly settings: GarageElectronicInvoiceSettingsRecord | null
  readonly connectionStatus: string
  readonly connectionMessages: readonly string[]
}

export function ElectronicInvoiceSettingsPanel({
  settings,
  connectionStatus,
  connectionMessages,
}: ElectronicInvoiceSettingsPanelProps) {
  return (
    <form action={saveElectronicInvoiceSettings} className="grid max-w-2xl gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <div>
        <h2 className="text-xl font-semibold">Plateforme agréée (PA)</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Garage OS délègue la transmission réglementaire à une PA externe. Les secrets API restent dans les variables d&apos;environnement serveur.
        </p>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm">
        <p><strong>Statut connexion :</strong> {connectionStatus}</p>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          {connectionMessages.map((message) => <li key={message}>{message}</li>)}
        </ul>
        <p className="mt-3 text-xs">Variables serveur : B2BROUTER_API_KEY, B2BROUTER_API_VERSION, B2BROUTER_API_BASE_URL, ELECTRONIC_INVOICE_ALLOW_PRODUCTION</p>
      </div>

      <label className="grid gap-2 text-sm">
        Fournisseur
        <select name="providerName" defaultValue={settings?.provider_name ?? "NONE"} className="min-h-11 rounded-md border px-3">
          <option value="NONE">Aucun</option>
          <option value="B2BROUTER">B2Brouter</option>
          <option value="TIIME">Tiime (futur)</option>
          <option value="BILLIT">Billit (futur)</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        Mode
        <select name="providerMode" defaultValue={settings?.provider_mode ?? "DISABLED"} className="min-h-11 rounded-md border px-3">
          <option value="DISABLED">Désactivé</option>
          <option value="UNCONFIGURED">Non configuré</option>
          <option value="SANDBOX">Sandbox</option>
        </select>
      </label>

      <label className="grid gap-2 text-sm">
        Compte sandbox (identifiant public)
        <input name="sandboxAccountId" defaultValue={settings?.sandbox_account_id ?? ""} className="min-h-11 rounded-md border px-3" placeholder="Identifiant compte B2Brouter sandbox" />
      </label>

      <input type="hidden" name="productionAccountId" value={settings?.production_account_id ?? ""} />

      <button type="submit" className="min-h-11 w-fit rounded-md bg-primary px-4 text-primary-foreground">
        Enregistrer
      </button>
    </form>
  )
}

import type { CustomerRecord } from "../types/customer"

type CustomerFormProps = {
  readonly action: (formData: FormData) => void | Promise<void>
  readonly customer?: CustomerRecord
  readonly customerId?: string
  readonly submitLabel: string
}

export function CustomerForm({ action, customer, customerId, submitLabel }: CustomerFormProps) {
  return (
    <form action={action} className="grid max-w-2xl gap-4 rounded-xl border bg-white p-4 sm:p-6">
      {customerId ? <input type="hidden" name="customerId" value={customerId} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Prénom
          <input name="firstName" defaultValue={customer?.first_name ?? ""} className="min-h-11 rounded-md border px-3" />
        </label>
        <label className="grid gap-2 text-sm">
          Nom
          <input name="lastName" defaultValue={customer?.last_name ?? ""} className="min-h-11 rounded-md border px-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        E-mail
        <input name="email" type="email" defaultValue={customer?.email ?? ""} className="min-h-11 rounded-md border px-3" />
      </label>
      <label className="grid gap-2 text-sm">
        Téléphone
        <input name="phone" type="tel" defaultValue={customer?.phone ?? ""} className="min-h-11 rounded-md border px-3" />
      </label>
      <label className="grid gap-2 text-sm">
        Adresse
        <input name="addressLine" defaultValue={customer?.address_line ?? ""} className="min-h-11 rounded-md border px-3" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Code postal
          <input name="postalCode" defaultValue={customer?.postal_code ?? ""} className="min-h-11 rounded-md border px-3" />
        </label>
        <label className="grid gap-2 text-sm">
          Ville
          <input name="city" defaultValue={customer?.city ?? ""} className="min-h-11 rounded-md border px-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        Notes internes
        <textarea name="notes" rows={4} defaultValue={customer?.notes ?? ""} className="rounded-md border px-3 py-2" />
      </label>
      <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
        {submitLabel}
      </button>
    </form>
  )
}

export function CustomerLeadForm({
  action,
  customerId,
}: {
  readonly action: (formData: FormData) => void | Promise<void>
  readonly customerId: string
}) {
  return (
    <form action={action} className="grid gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <input type="hidden" name="customerId" value={customerId} />
      <label className="grid gap-2 text-sm">
        Message / demande
        <textarea name="message" rows={5} className="rounded-md border px-3 py-2" placeholder="Décrivez la demande du client…" />
      </label>
      <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
        Créer la demande commerciale
      </button>
    </form>
  )
}

export function CustomerVehicleForm({
  action,
  customerId,
}: {
  readonly action: (formData: FormData) => void | Promise<void>
  readonly customerId: string
}) {
  return (
    <form action={action} className="grid gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Immatriculation
          <input name="registrationNumber" className="min-h-11 rounded-md border px-3" />
        </label>
        <label className="grid gap-2 text-sm">
          VIN
          <input name="vin" className="min-h-11 rounded-md border px-3" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Marque
          <input name="brand" className="min-h-11 rounded-md border px-3" />
        </label>
        <label className="grid gap-2 text-sm">
          Modèle
          <input name="model" className="min-h-11 rounded-md border px-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        Version
        <input name="version" className="min-h-11 rounded-md border px-3" />
      </label>
      <label className="grid gap-2 text-sm">
        Identifiant véhicule stock (optionnel)
        <input name="stockVehicleId" placeholder="UUID du véhicule en stock" className="min-h-11 rounded-md border px-3 font-mono text-sm" />
      </label>
      <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
        Ajouter le véhicule
      </button>
    </form>
  )
}

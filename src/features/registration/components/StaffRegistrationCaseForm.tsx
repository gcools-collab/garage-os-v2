import Link from "next/link"

import { registrationProcedureLabels, registrationProcedureTypes } from "../types/registration"

type StaffRegistrationCaseFormProps = {
  readonly action: (formData: FormData) => void | Promise<void>
  readonly customerId: string
  readonly customerName: string
  readonly cancelHref: string
  readonly appointmentId?: string | null
}

export function StaffRegistrationCaseForm({
  action,
  customerId,
  customerName,
  cancelHref,
  appointmentId,
}: StaffRegistrationCaseFormProps) {
  return (
    <form action={action} className="grid max-w-2xl gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <input type="hidden" name="customerId" value={customerId} />
      {appointmentId ? <input type="hidden" name="appointmentId" value={appointmentId} /> : null}
      <p className="text-sm text-muted-foreground">
        Client : <strong>{customerName}</strong>
        {appointmentId ? " · lié à un rendez-vous existant" : " · sans rendez-vous préalable"}
      </p>
      <label className="grid gap-2 text-sm">
        Type de démarche
        <select name="procedureType" required className="min-h-11 rounded-md border px-3">
          {registrationProcedureTypes.map((type) => (
            <option key={type} value={type}>{registrationProcedureLabels[type]}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">
          Immatriculation
          <input name="registrationNumber" className="min-h-11 rounded-md border px-3" />
        </label>
        <label className="grid gap-2 text-sm">
          Marque
          <input name="brand" className="min-h-11 rounded-md border px-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        Modèle
        <input name="model" className="min-h-11 rounded-md border px-3" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
          Créer le dossier
        </button>
        <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">
          Annuler
        </Link>
      </div>
    </form>
  )
}

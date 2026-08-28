import Link from "next/link"

import { APPOINTMENT_TYPES } from "../types/scheduling"
import { appointmentTypeLabels } from "../builders/scheduling-builders"

type StaffAppointmentFormProps = {
  readonly action: (formData: FormData) => void | Promise<void>
  readonly customerId: string
  readonly customerName: string
  readonly cancelHref: string
}

export function StaffAppointmentForm({
  action,
  customerId,
  customerName,
  cancelHref,
}: StaffAppointmentFormProps) {
  return (
    <form action={action} className="grid max-w-2xl gap-4 rounded-xl border bg-white p-4 sm:p-6">
      <input type="hidden" name="customerId" value={customerId} />
      <p className="text-sm text-muted-foreground">
        Client : <strong>{customerName}</strong>
      </p>
      <label className="grid gap-2 text-sm">
        Prestation
        <select name="type" required className="min-h-11 rounded-md border px-3">
          {APPOINTMENT_TYPES.map((type) => (
            <option key={type} value={type}>{appointmentTypeLabels[type]}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm">
        Date et heure
        <input name="startsAt" type="datetime-local" required className="min-h-11 rounded-md border px-3" />
      </label>
      <label className="grid gap-2 text-sm">
        Notes internes
        <textarea name="notes" rows={3} className="rounded-md border px-3 py-2" placeholder="Informations utiles pour l’équipe…" />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground">
          Créer le rendez-vous
        </button>
        <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-md border px-4 text-sm">
          Annuler
        </Link>
      </div>
    </form>
  )
}

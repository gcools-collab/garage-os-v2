"use client"

import { Archive, BadgeCheck, EyeOff, Handshake, Loader2, Send, ShoppingBag } from "lucide-react"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { executePublicationAction } from "@/features/publication-execution/repositories/publication-execution-action"
import type { PublicationExecutionActionState } from "@/features/publication-execution"
import type { PublicationActionContract } from "../types"

const icons = {
  MARK_READY: BadgeCheck,
  PUBLISH: Send,
  UNPUBLISH: EyeOff,
  RESERVE: Handshake,
  SELL: ShoppingBag,
  ARCHIVE: Archive,
} as const

const initialState: PublicationExecutionActionState = { status: "IDLE", message: null }

function PublicationActionForm({
  vehicleId,
  action,
}: {
  readonly vehicleId: string
  readonly action: PublicationActionContract
}) {
  const [state, formAction, pending] = useActionState(executePublicationAction, initialState)
  const Icon = icons[action.type]
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="vehicleId" value={vehicleId} />
      <input type="hidden" name="action" value={action.type} />
      <Button
        type="submit"
        variant={action.type === "PUBLISH" ? "default" : "outline"}
        disabled={!action.enabled || pending}
        title={action.enabled ? action.confirmationDescription : "Transition indisponible"}
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Icon aria-hidden="true" />}
        {pending ? "Traitement…" : action.label}
      </Button>
      {state.message ? (
        <p
          className={state.status === "ERROR" ? "text-xs text-destructive" : "text-xs text-emerald-700"}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

export function PublicationActions({
  vehicleId,
  actions,
}: {
  readonly vehicleId: string
  readonly actions: readonly PublicationActionContract[]
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Actions</CardTitle>
        <CardDescription>
          Chaque décision est validée côté serveur puis appliquée au catalogue public.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-start gap-3">
        {actions.map((action) => (
          <PublicationActionForm key={action.type} vehicleId={vehicleId} action={action} />
        ))}
      </CardContent>
    </Card>
  )
}

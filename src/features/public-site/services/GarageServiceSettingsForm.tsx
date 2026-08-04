"use client"

import { Loader2, Save } from "lucide-react"
import { FormEvent, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { GarageServiceSettingsViewModel } from "./public-services"
import { getGarageServiceLabel, type GarageServiceUpdateInput, type GarageServiceUpdateResult } from "./garage-service-settings"

function text(data: FormData, name: string) {
  const value = String(data.get(name) ?? "").trim()
  return value || null
}

export function GarageServiceSettingsForm({ settings, updateServices }: {
  readonly settings: GarageServiceSettingsViewModel
  readonly updateServices: (input: GarageServiceUpdateInput) => Promise<GarageServiceUpdateResult>
}) {
  const [result, setResult] = useState<GarageServiceUpdateResult | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const services = settings.groups.flatMap((group) => group.services).map((service) => ({
      serviceKey: service.serviceKey,
      status: data.has(`enabled.${service.serviceKey}`) ? "ENABLED" as const : "DISABLED" as const,
      publicTitle: text(data, `title.${service.serviceKey}`),
      publicDescription: text(data, `description.${service.serviceKey}`),
      publicCtaLabel: text(data, `cta.${service.serviceKey}`),
      displayOrder: Number(data.get(`order.${service.serviceKey}`) ?? 0),
    }))
    startTransition(async () => setResult(await updateServices({ services })))
  }

  const disabled = !settings.canEdit || pending
  return (
    <form onSubmit={submit} className="space-y-6">
      {!settings.canEdit ? <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">Vous disposez d’un accès en lecture seule. Un propriétaire ou administrateur peut modifier ces services.</p> : null}
      {settings.groups.map((group) => (
        <Card key={group.title}>
          <CardHeader><CardTitle>{group.title}</CardTitle><CardDescription>Activez et personnalisez les services visibles publiquement.</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            {group.services.map((service) => (
              <fieldset key={service.serviceKey} className="grid gap-4 rounded-lg border p-4 md:grid-cols-2">
                <legend className="sr-only">{getGarageServiceLabel(service.serviceKey)}</legend>
                <label className="flex items-center gap-3 font-medium md:col-span-2"><input name={`enabled.${service.serviceKey}`} type="checkbox" defaultChecked={service.status === "ENABLED"} disabled={disabled} className="size-4" />{getGarageServiceLabel(service.serviceKey)}</label>
                <label className="grid gap-2 text-sm">Titre public<Input name={`title.${service.serviceKey}`} defaultValue={service.publicTitle ?? ""} disabled={disabled} maxLength={120} /></label>
                <label className="grid gap-2 text-sm">Libellé du bouton<Input name={`cta.${service.serviceKey}`} defaultValue={service.publicCtaLabel ?? ""} disabled={disabled} maxLength={80} /></label>
                <label className="grid gap-2 text-sm md:col-span-2">Description publique<textarea name={`description.${service.serviceKey}`} defaultValue={service.publicDescription ?? ""} disabled={disabled} maxLength={500} className="min-h-20 rounded-md border bg-transparent px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" /></label>
                <label className="grid max-w-32 gap-2 text-sm">Ordre<Input name={`order.${service.serviceKey}`} type="number" min={0} step={1} defaultValue={service.displayOrder} disabled={disabled} /></label>
              </fieldset>
            ))}
          </CardContent>
        </Card>
      ))}
      {result ? <p role="status" className={result.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>{result.message}</p> : null}
      {settings.canEdit ? <div className="flex justify-end"><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}{pending ? "Enregistrement…" : "Enregistrer les services"}</Button></div> : null}
    </form>
  )
}


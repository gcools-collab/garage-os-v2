"use client"

import { Loader2, Save } from "lucide-react"
import { FormEvent, ReactNode, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type {
  GarageBrandingSettingsViewModel,
  GarageBrandingUpdateInput,
  GarageBrandingUpdateResult,
} from "../types"

function Field({
  label,
  name,
  value,
  type = "text",
  disabled,
  error,
}: {
  readonly label: string
  readonly name: string
  readonly value: string
  readonly type?: string
  readonly disabled: boolean
  readonly error?: readonly string[]
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <Input name={name} type={type} defaultValue={value} disabled={disabled} aria-invalid={Boolean(error?.length)} />
      {error?.length ? <span className="text-xs text-destructive">{error.join(" ")}</span> : null}
    </label>
  )
}

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "")
}

export function buildGarageBrandingUpdateInput(formData: FormData): GarageBrandingUpdateInput {
  return {
    displayName: value(formData, "displayName"),
    legalName: value(formData, "legalName"),
    phone: value(formData, "phone"),
    email: value(formData, "email"),
    websiteUrl: value(formData, "websiteUrl"),
    addressLine1: value(formData, "addressLine1"),
    addressLine2: value(formData, "addressLine2"),
    postalCode: value(formData, "postalCode"),
    city: value(formData, "city"),
    countryCode: value(formData, "countryCode"),
    shortDescription: value(formData, "shortDescription"),
    facebookUrl: value(formData, "facebookUrl"),
    instagramUrl: value(formData, "instagramUrl"),
    themeKey: value(formData, "themeKey"),
    primaryColor: value(formData, "primaryColor"),
    secondaryColor: value(formData, "secondaryColor"),
    accentColor: value(formData, "accentColor"),
  }
}

export function BrandingSettingsForm({
  settings,
  updateBranding,
  themeSelector,
}: {
  readonly settings: GarageBrandingSettingsViewModel
  readonly updateBranding: (input: GarageBrandingUpdateInput) => Promise<GarageBrandingUpdateResult>
  readonly themeSelector: ReactNode
}) {
  const [result, setResult] = useState<GarageBrandingUpdateResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const disabled = !settings.canEdit || isPending
  const errors = result && !result.success ? result.fieldErrors : undefined

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const input = buildGarageBrandingUpdateInput(formData)
    startTransition(async () => {
      const actionResult = await updateBranding(input)
      setResult(actionResult)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {settings.readOnlyMessage ? (
        <p className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">{settings.readOnlyMessage}</p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>Les noms et la présentation publique de votre établissement.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Nom d’affichage" name="displayName" value={settings.values.displayName} disabled={disabled} error={errors?.displayName} />
          <Field label="Raison sociale" name="legalName" value={settings.values.legalName} disabled={disabled} error={errors?.legalName} />
          <label className="grid gap-2 text-sm font-medium md:col-span-2">
            Description courte
            <textarea name="shortDescription" defaultValue={settings.values.shortDescription} disabled={disabled} maxLength={500} className="min-h-28 rounded-md border bg-transparent px-3 py-2 font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" />
            {errors?.shortDescription?.length ? <span className="text-xs text-destructive">{errors.shortDescription.join(" ")}</span> : null}
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contact</CardTitle><CardDescription>Les coordonnées utiles à vos clients.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Téléphone" name="phone" value={settings.values.phone} disabled={disabled} error={errors?.phone} />
          <Field label="Email" name="email" type="email" value={settings.values.email} disabled={disabled} error={errors?.email} />
          <Field label="Site web" name="websiteUrl" type="url" value={settings.values.websiteUrl} disabled={disabled} error={errors?.websiteUrl} />
          <Field label="Facebook" name="facebookUrl" type="url" value={settings.values.facebookUrl} disabled={disabled} error={errors?.facebookUrl} />
          <Field label="Instagram" name="instagramUrl" type="url" value={settings.values.instagramUrl} disabled={disabled} error={errors?.instagramUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Adresse</CardTitle><CardDescription>L’adresse affichée dans les expériences publiques.</CardDescription></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <Field label="Adresse" name="addressLine1" value={settings.values.addressLine1} disabled={disabled} error={errors?.addressLine1} />
          <Field label="Complément" name="addressLine2" value={settings.values.addressLine2} disabled={disabled} error={errors?.addressLine2} />
          <Field label="Code postal" name="postalCode" value={settings.values.postalCode} disabled={disabled} error={errors?.postalCode} />
          <Field label="Ville" name="city" value={settings.values.city} disabled={disabled} error={errors?.city} />
          <Field label="Pays" name="countryCode" value={settings.values.countryCode} disabled={disabled} error={errors?.countryCode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Thème</CardTitle><CardDescription>Cette identité visuelle sera appliquée à Garage OS Live.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {themeSelector}
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Couleur principale" name="primaryColor" value={settings.values.primaryColor} disabled={disabled} error={errors?.primaryColor} />
            <Field label="Couleur secondaire" name="secondaryColor" value={settings.values.secondaryColor} disabled={disabled} error={errors?.secondaryColor} />
            <Field label="Couleur d’accent" name="accentColor" value={settings.values.accentColor} disabled={disabled} error={errors?.accentColor} />
          </div>
        </CardContent>
      </Card>

      {result ? (
        <p role="status" className={result.success ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
          {result.success ? "Branding enregistré avec succès." : result.message}
        </p>
      ) : null}
      {settings.canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
            {isPending ? "Enregistrement…" : "Enregistrer le branding"}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

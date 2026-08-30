"use client"

import { ImageOff, Loader2, Trash2, Upload } from "lucide-react"
import { useEffect, useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { GarageLogoActionResult } from "../types"
import { validateLogoFile } from "../validation"

function LogoPreview({
  src,
  alt,
  fallbackLabel,
}: {
  readonly src: string | null
  readonly alt: string
  readonly fallbackLabel: string
}) {
  const [broken, setBroken] = useState(false)

  return (
    <div className="flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40 p-2">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob/preview URLs and Storage URLs of arbitrary origin, not a next/image candidate here
        <img
          src={src}
          alt={alt}
          onError={() => setBroken(true)}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="flex flex-col items-center gap-1 text-center text-xs text-muted-foreground">
          <ImageOff className="size-5" aria-hidden="true" />
          {fallbackLabel}
        </span>
      )}
    </div>
  )
}

export function GarageLogoUploader({
  logoUrl,
  garageName,
  canEdit,
  uploadLogo,
  removeLogo,
}: {
  readonly logoUrl: string | null
  readonly garageName: string
  readonly canEdit: boolean
  readonly uploadLogo: (formData: FormData) => Promise<GarageLogoActionResult>
  readonly removeLogo: () => Promise<GarageLogoActionResult>
}) {
  const [persistedLogoUrl, setPersistedLogoUrl] = useState(logoUrl)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [result, setResult] = useState<GarageLogoActionResult | null>(null)
  const [lastAction, setLastAction] = useState<"upload" | "remove" | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setResult(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    if (!file) {
      setPendingFile(null)
      setPreviewUrl(null)
      setClientError(null)
      return
    }
    const error = validateLogoFile(file)
    if (error) {
      setPendingFile(null)
      setPreviewUrl(null)
      setClientError(error)
      return
    }
    setClientError(null)
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleSave() {
    if (!pendingFile) return
    const formData = new FormData()
    formData.set("logo", pendingFile)
    startTransition(async () => {
      const actionResult = await uploadLogo(formData)
      setResult(actionResult)
      setLastAction("upload")
      if (actionResult.success) {
        setPersistedLogoUrl(actionResult.logoUrl)
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
        setPendingFile(null)
        if (inputRef.current) inputRef.current.value = ""
      }
    })
  }

  function handleCancelSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPendingFile(null)
    setClientError(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  function handleRemove() {
    startTransition(async () => {
      const actionResult = await removeLogo()
      setResult(actionResult)
      setLastAction("remove")
      if (actionResult.success) {
        setPersistedLogoUrl(null)
      }
    })
  }

  const disabled = !canEdit || isPending
  const displayedSrc = previewUrl ?? persistedLogoUrl
  const fallbackLabel = previewUrl ? "Aperçu" : `Pas de logo — ${garageName || "votre garage"}`

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <LogoPreview key={displayedSrc ?? "empty"} src={displayedSrc} alt={garageName} fallbackLabel={fallbackLabel} />
        <div className="grid min-w-0 flex-1 gap-3">
          <label className="grid gap-2 text-sm font-medium">
            Téléverser un logo
            <Input
              ref={inputRef}
              type="file"
              accept="image/png,image/webp,image/jpeg"
              disabled={disabled}
              onChange={handleFileChange}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            PNG, JPEG ou WebP — 2 Mo maximum, entre 32×32 et 4096×4096 px. Formats horizontal, carré ou circulaire acceptés.
          </p>
          {clientError ? <p className="text-xs text-destructive">{clientError}</p> : null}
          <div className="flex flex-wrap gap-2">
            {pendingFile ? (
              <>
                <Button type="button" size="sm" onClick={handleSave} disabled={disabled}>
                  {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                  {isPending ? "Enregistrement…" : "Enregistrer le logo"}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleCancelSelection} disabled={isPending}>
                  Annuler
                </Button>
              </>
            ) : null}
            {!pendingFile && persistedLogoUrl && canEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={handleRemove} disabled={disabled}>
                {isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                Supprimer le logo
              </Button>
            ) : null}
          </div>
          {result ? (
            <p role="status" className={result.success ? "text-xs text-emerald-700" : "text-xs text-destructive"}>
              {result.success
                ? lastAction === "remove"
                  ? "Logo supprimé."
                  : "Logo mis à jour."
                : result.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

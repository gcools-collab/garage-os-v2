"use client"

import { useState, useTransition } from "react"
import { RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { refreshMarketplaceLink } from "@/features/acquisition/marketplace-link-actions"

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
})

export function MarketplaceLinkRefreshButton({ linkId }: { linkId: string }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{
    success: boolean
    message: string
    observedAt?: string
  } | null>(null)

  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          setFeedback(null)
          startTransition(async () => {
            setFeedback(await refreshMarketplaceLink(linkId))
          })
        }}
      >
        <RefreshCw className={pending ? "animate-spin" : undefined} aria-hidden="true" />
        {pending ? "Actualisation..." : "Actualiser l’annonce"}
      </Button>
      {feedback && (
        <p
          className={feedback.success ? "text-xs text-emerald-700" : "max-w-64 text-xs text-destructive"}
          role="status"
        >
          {feedback.message}
          {feedback.observedAt
            ? ` Dernière observation : ${dateTime.format(new Date(feedback.observedAt))}.`
            : ""}
        </p>
      )}
    </div>
  )
}

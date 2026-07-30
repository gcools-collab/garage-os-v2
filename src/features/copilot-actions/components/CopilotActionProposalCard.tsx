"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Check, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  cancelCopilotAction,
  confirmCopilotAction,
} from "../actions/copilot-action-actions"
import type { CopilotActionProposalViewModel } from "../types"

export function CopilotActionProposalCard({
  initialProposal,
}: {
  readonly initialProposal: CopilotActionProposalViewModel
}) {
  const [proposal, setProposal] = useState(initialProposal)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function decide(decision: "confirm" | "cancel") {
    startTransition(async () => {
      const result = decision === "confirm"
        ? await confirmCopilotAction({ proposalId: proposal.id })
        : await cancelCopilotAction({ proposalId: proposal.id })
      setFeedback(result.success ? result.message : result.error)
      if (result.success) setProposal(result.proposal)
    })
  }

  return (
    <Card className="border-primary/20 bg-background">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline">Proposition</Badge>
          <Badge variant="secondary">{proposal.statusLabel}</Badge>
        </div>
        <CardTitle className="text-base">{proposal.summary.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{proposal.summary.targetLabel}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          {proposal.summary.details.map((detail) => (
            <div key={detail.label} className="rounded-lg bg-muted/50 p-3">
              <dt className="text-xs text-muted-foreground">{detail.label}</dt>
              {detail.before ? <dd className="mt-1 text-xs line-through opacity-70">{detail.before}</dd> : null}
              <dd className="font-medium">{detail.after}</dd>
            </div>
          ))}
        </dl>
        <div className="text-sm">
          <p><span className="font-medium">Pourquoi :</span> {proposal.summary.explanation}</p>
          <p className="mt-1"><span className="font-medium">Confiance :</span> {proposal.summary.confidenceLabel}</p>
        </div>
        {proposal.navigationHref ? (
          <Button asChild><Link href={proposal.navigationHref}>Ouvrir</Link></Button>
        ) : null}
        {proposal.canConfirm || proposal.canCancel ? (
          <div className="flex flex-wrap gap-2">
            {proposal.canCancel ? (
              <Button variant="outline" onClick={() => decide("cancel")} disabled={pending}>
                <X aria-hidden="true" /> Annuler
              </Button>
            ) : null}
            {proposal.canConfirm ? (
              <Button onClick={() => decide("confirm")} disabled={pending}>
                <Check aria-hidden="true" /> {pending ? "Exécution…" : "Confirmer"}
              </Button>
            ) : null}
          </div>
        ) : null}
        {feedback ? <p role="status" className="text-sm text-muted-foreground">{feedback}</p> : null}
      </CardContent>
    </Card>
  )
}

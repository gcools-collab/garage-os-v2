import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import type { PublicationWorkspaceViewModel } from "../presentation"
import { PublicationActions } from "./PublicationActions"
import { PublicationChecklist, PublicationIssueCard } from "./PublicationChecklist"
import { PublicationPublicPreview, PublicationSeoPreview } from "./PublicationPreviews"
import { PublicationSummary } from "./PublicationSummary"

export function PublicationWorkspace({
  workspace,
}: {
  readonly workspace: PublicationWorkspaceViewModel
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-24 lg:pb-8">
      <header className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href={workspace.backHref}><ArrowLeft aria-hidden="true" />Retour à la fiche</Link>
        </Button>
        <div>
          <p className="text-sm font-medium text-muted-foreground">Publication</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{workspace.title}</h1>
          <p className="mt-1 text-muted-foreground">{workspace.subtitle}</p>
        </div>
      </header>

      <PublicationSummary workspace={workspace} />
      <PublicationChecklist items={workspace.checklist} />

      <section className="grid items-start gap-6 lg:grid-cols-2" aria-label="Diagnostic de publication">
        <PublicationIssueCard
          title="Blocages"
          description="Ces éléments empêchent la publication."
          items={workspace.blockers}
        />
        <PublicationIssueCard
          title="Avertissements"
          description="Ces améliorations sont recommandées sans être bloquantes."
          items={workspace.warnings}
        />
      </section>

      <section className="grid items-start gap-6 lg:grid-cols-2" aria-label="Prévisualisations">
        <PublicationPublicPreview preview={workspace.publicPreview} />
        <PublicationSeoPreview preview={workspace.seoPreview} />
      </section>

      <PublicationActions actions={workspace.actions} />
    </div>
  )
}

import { AlertTriangle, ArrowRight, CircleCheck } from "lucide-react"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SectionHeading } from "./executive-summary"
import type { ExecutivePriority } from "./types"

export function ExecutivePriorityActions({ priorities }: { priorities: ExecutivePriority[] }) {
  return <section aria-labelledby="priorities-title" className="space-y-4">
    <SectionHeading id="priorities-title" title="Actions prioritaires" description="Les informations à compléter et les contrôles à lancer aujourd’hui." />
    <Card>
      <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="size-5 text-orange-600" />Aujourd’hui</CardTitle></CardHeader>
      <CardContent>
        {priorities.length === 0 ? <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800"><CircleCheck className="size-5" /><span className="font-medium">Aucune action prioritaire.</span></div> : <ul className="grid gap-x-8 md:grid-cols-2">
          {priorities.map((priority) => <li key={priority.id}>
            <Link href={priority.href} className="group flex items-center justify-between gap-4 border-b py-3 last:border-b-0 hover:text-primary">
              <span className="flex min-w-0 items-center gap-3"><span className={priority.tone === "danger" ? "inline-flex min-w-8 justify-center rounded-md bg-red-50 px-2 py-1 font-semibold tabular-nums text-red-700" : "inline-flex min-w-8 justify-center rounded-md bg-orange-50 px-2 py-1 font-semibold tabular-nums text-orange-700"}>{priority.count}</span><span className="truncate text-sm font-medium">{priority.label}</span></span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>)}
        </ul>}
      </CardContent>
    </Card>
  </section>
}

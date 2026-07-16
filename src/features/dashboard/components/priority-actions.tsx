import Link from "next/link"
import { AlertCircle, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardPriority } from "../types/dashboard"

export function PriorityActions({ priorities }: { priorities: DashboardPriority[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="size-5 text-amber-600" aria-hidden="true" />
          <CardTitle className="text-lg">À traiter</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {priorities.map((priority) => (
            <li key={priority.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <p className="min-w-0 text-sm">
                <span className="mr-2 inline-flex min-w-7 justify-center rounded-md bg-amber-50 px-2 py-1 font-semibold tabular-nums text-amber-800">
                  {priority.count}
                </span>
                véhicule{priority.count > 1 ? "s" : ""} {priority.label}
              </p>
              <Button asChild variant="ghost" size="sm">
                <Link href={priority.href}>
                  Compléter
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

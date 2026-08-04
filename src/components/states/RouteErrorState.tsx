"use client"

import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function RouteErrorState({
  retry,
  backHref,
  backLabel,
}: {
  readonly retry: () => void
  readonly backHref: string
  readonly backLabel: string
}) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <span className="mb-2 grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle aria-hidden="true" className="size-5" />
          </span>
          <CardTitle>Cette page est momentanément indisponible</CardTitle>
          <CardDescription>
            Vos données n’ont pas été modifiées. Réessayez ou revenez à l’écran précédent.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button type="button" onClick={retry}>
            <RotateCcw aria-hidden="true" /> Réessayer
          </Button>
          <Button asChild variant="outline">
            <Link href={backHref}><ArrowLeft aria-hidden="true" /> {backLabel}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

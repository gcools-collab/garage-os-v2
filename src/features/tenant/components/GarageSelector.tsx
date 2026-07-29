"use client"

import { Building2, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { setActiveGarage } from "../actions"
import type { GarageSelectionViewModel } from "../types"

export function GarageSelector({ selection }: { readonly selection: GarageSelectionViewModel }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pendingGarageId, setPendingGarageId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function selectGarage(garageId: string) {
    setError(null)
    setPendingGarageId(garageId)
    startTransition(async () => {
      const result = await setActiveGarage(garageId)
      if (!result.success) {
        setError(result.error)
        setPendingGarageId(null)
        return
      }
      router.push("/dashboard")
      router.refresh()
    })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-12">
      <div className="w-full">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{selection.title}</h1>
          <p className="mt-2 text-muted-foreground">{selection.description}</p>
        </header>

        {selection.garages.length === 0 ? (
          <Card><CardContent className="text-center text-muted-foreground">{selection.emptyMessage}</CardContent></Card>
        ) : (
          <div className="grid gap-4">
            {selection.garages.map((garage) => (
              <Card key={garage.garageId}>
                <CardHeader className="sm:grid-cols-[1fr_auto]">
                  <div className="flex items-start gap-4">
                    <span className="rounded-lg bg-muted p-3"><Building2 className="size-5" aria-hidden="true" /></span>
                    <div>
                      <CardTitle>{garage.garageName}</CardTitle>
                      <CardDescription className="mt-1">
                        {garage.roleLabel}{garage.cityLabel ? ` · ${garage.cityLabel}` : ""}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={isPending}
                    onClick={() => selectGarage(garage.garageId)}
                  >
                    {isPending && pendingGarageId === garage.garageId
                      ? <><Loader2 className="animate-spin" aria-hidden="true" />Ouverture…</>
                      : "Ouvrir ce garage"}
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
        {error ? <p role="alert" className="mt-4 text-center text-sm text-destructive">{error}</p> : null}
      </div>
    </main>
  )
}

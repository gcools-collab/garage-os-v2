"use client"

import { useEffect } from "react"

import { RouteErrorState } from "@/components/states/RouteErrorState"

export default function DashboardError({
  error,
  unstable_retry,
}: {
  readonly error: Error & { readonly digest?: string }
  readonly unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("dashboard_route_failed", {
      errorType: error.name,
      digest: error.digest,
    })
  }, [error])

  return <RouteErrorState retry={unstable_retry} backHref="/dashboard" backLabel="Retour au tableau de bord" />
}

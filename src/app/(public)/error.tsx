"use client"

import { useEffect } from "react"

import { RouteErrorState } from "@/components/states/RouteErrorState"

export default function PublicError({
  error,
  unstable_retry,
}: {
  readonly error: Error & { readonly digest?: string }
  readonly unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("public_route_failed", {
      errorType: error.name,
      digest: error.digest,
    })
  }, [error])

  return <RouteErrorState retry={unstable_retry} backHref="/" backLabel="Retour à l’accueil" />
}

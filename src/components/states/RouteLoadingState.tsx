export function RouteLoadingState({ label = "Chargement en cours" }: { readonly label?: string }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6 py-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-xl border bg-muted/60" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-xl border bg-muted/40" />
    </div>
  )
}

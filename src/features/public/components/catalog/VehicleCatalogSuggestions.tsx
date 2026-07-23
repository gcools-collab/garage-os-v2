import Link from "next/link"
import type { LiveVehicleCatalog } from "../../types"

export function VehicleCatalogSuggestions({ suggestions }: { suggestions: LiveVehicleCatalog["suggestions"] }) {
  if (!suggestions.length) return null
  return <div className="mt-5 flex flex-wrap justify-center gap-3">{suggestions.map((suggestion) => <Link key={suggestion.href} href={suggestion.href} className="rounded-full border border-[var(--live-border)] px-4 py-2 text-sm">{suggestion.label}</Link>)}</div>
}

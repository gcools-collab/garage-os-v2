import { redirect } from "next/navigation"

export default function LiveLandingPage() {
  const garageSlug = process.env.NEXT_PUBLIC_DEFAULT_LIVE_GARAGE_SLUG?.trim()
  if (garageSlug) redirect(`/g/${encodeURIComponent(garageSlug)}`)
  return <main><h1>Garage OS Live</h1><p>Aucun site public n’est configuré.</p></main>
}

import { redirect } from "next/navigation"

export default async function PublicVehiclesAliasPage({
  params,
}: {
  readonly params: Promise<{ readonly garageSlug: string }>
}) {
  const { garageSlug } = await params
  redirect(`/g/${encodeURIComponent(garageSlug)}/stock`)
}

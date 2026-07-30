import { redirect } from "next/navigation"

export default async function LegacyVehicleUrl({
  params,
}: {
  readonly params: Promise<{
    readonly garageSlug: string
    readonly vehicleSlug: string
  }>
}) {
  const { garageSlug, vehicleSlug } = await params
  redirect(
    `/g/${encodeURIComponent(garageSlug)}/vehicules/${encodeURIComponent(vehicleSlug)}`
  )
}

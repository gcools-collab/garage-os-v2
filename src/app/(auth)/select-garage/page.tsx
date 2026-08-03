import { redirect } from "next/navigation"

import {
  GarageSelector,
  buildGarageSelection,
  getActiveGarageSession,
  resolveGarageSessionRoute,
} from "@/features/tenant"

export default async function SelectGaragePage() {
  const session = await getActiveGarageSession()
  if (!session) redirect("/auth/recover")
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/select-garage") redirect(destination)

  return <GarageSelector selection={buildGarageSelection(session)} />
}

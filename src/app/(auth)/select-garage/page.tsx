import { redirect } from "next/navigation"

import {
  GarageSelector,
  buildGarageSelection,
  getActiveGarageSession,
  resolveGarageSessionRoute,
} from "@/features/tenant"

export default async function SelectGaragePage() {
  const session = await getActiveGarageSession()
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/select-garage") redirect(destination)
  if (!session) redirect("/register")

  return <GarageSelector selection={buildGarageSelection(session)} />
}

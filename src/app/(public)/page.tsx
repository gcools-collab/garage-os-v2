import { redirect } from "next/navigation"

import { getActiveGarageSession } from "@/features/tenant"
import { resolveRootAuthRoute } from "@/features/auth/session-flow"

export default async function RootPage() {
  const session = await getActiveGarageSession()
  redirect(resolveRootAuthRoute(session))
}

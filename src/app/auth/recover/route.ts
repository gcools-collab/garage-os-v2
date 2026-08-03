import { NextResponse } from "next/server"

import { clearActiveGarageCookie } from "@/features/tenant/data"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined)
  await clearActiveGarageCookie()
  return NextResponse.redirect(new URL("/login", request.url))
}

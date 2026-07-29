import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { GarageMembership } from "../types"

type MembershipRow = {
  readonly garage_id: string | null
  readonly user_id: string | null
  readonly role: string | null
}

type GarageRow = {
  readonly id: string
  readonly name: string
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export async function loadCurrentUserGarageMemberships(): Promise<{
  readonly userId: string
  readonly memberships: readonly GarageMembership[]
} | null> {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error("Unable to resolve tenant user", { code: userError.code, message: userError.message })
    throw new Error("Impossible de vérifier la session utilisateur.")
  }
  if (!user) return null

  const { data: membershipData, error: membershipError } = await supabase
    .from("garage_members")
    .select("garage_id, user_id, role")
    .eq("user_id", user.id)

  if (membershipError) {
    console.error("Unable to resolve garage memberships", { code: membershipError.code, message: membershipError.message })
    throw new Error("Impossible de charger les appartenances aux garages.")
  }

  const membershipRows = (membershipData ?? []) as MembershipRow[]
  const garageIds = [...new Set(membershipRows.flatMap((membership) => membership.garage_id ? [membership.garage_id] : []))]
  if (garageIds.length === 0) return { userId: user.id, memberships: [] }

  const { data: garageData, error: garageError } = await supabase
    .from("garages")
    .select("id, name")
    .in("id", garageIds)

  if (garageError) {
    console.error("Unable to resolve authorized garages", { code: garageError.code, message: garageError.message })
    throw new Error("Impossible de charger les garages autorisés.")
  }

  const garagesById = new Map(
    ((garageData ?? []) as GarageRow[]).map((garage) => [garage.id, garage])
  )
  const memberships = membershipRows.flatMap((membership): GarageMembership[] => {
    if (!membership.garage_id || membership.user_id !== user.id) return []
    const garage = garagesById.get(membership.garage_id)
    if (!garage) return []
    return [{
      userId: user.id,
      garageId: garage.id,
      garageName: garage.name,
      garageSlug: slugify(garage.name),
      memberRole: membership.role ?? "member",
      city: null,
    }]
  })

  return { userId: user.id, memberships }
}

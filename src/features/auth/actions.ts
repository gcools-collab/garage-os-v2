"use server"

import { createClient } from "@/lib/supabase/server"
import {
  clearActiveGarageCookie,
  loadCurrentUserGarageMemberships,
  persistActiveGarageCookie,
} from "@/features/tenant/data"
import { redirect } from "next/navigation"
import { z } from "zod"
import { loginExistingUser, logAuthDiagnostic, logoutSession } from "./session-flow"
import type { LoginActionState } from "./state"

const loginSchema = z.object({
  email: z.email("Adresse email invalide."),
  password: z.string().min(1, "Le mot de passe est obligatoire."),
})

export async function login(
  previousState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  void previousState
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    const errors = z.flattenError(parsed.error).fieldErrors
    return {
      status: "ERROR",
      message: "Vérifiez les informations saisies.",
      fieldErrors: { email: errors.email ?? [], password: errors.password ?? [] },
    }
  }

  const supabase = await createClient()
  const result = await loginExistingUser({
    authenticate: async () => {
      const { data, error } = await supabase.auth.signInWithPassword(parsed.data)
      if (error || !data.user) return { success: false }
      await clearActiveGarageCookie()
      return {
        success: true,
        identity: {
          userId: data.user.id,
          email: data.user.email ?? null,
          displayName: typeof data.user.user_metadata?.full_name === "string"
            ? data.user.user_metadata.full_name
            : null,
        },
      }
    },
    loadMemberships: async (userId) => {
      const context = await loadCurrentUserGarageMemberships()
      return context?.userId === userId ? context.memberships : []
    },
    persistGarage: persistActiveGarageCookie,
  })
  if (!result.success) return { status: "ERROR", message: result.message }

  logAuthDiagnostic({
    userId: result.identity.userId,
    email: result.identity.email,
    membershipCount: result.membershipCount,
    activeGarageId: result.activeGarageId,
    reason: `login_redirect:${result.destination}`,
  })
  redirect(result.destination)
}

export async function logout(): Promise<void> {
  const supabase = await createClient()
  await logoutSession({
    signOut: async () => {
      const { error } = await supabase.auth.signOut()
      if (error && process.env.NODE_ENV === "development") {
        console.info("Auth logout completed with stale remote session", { code: error.code })
      }
    },
    clearGarage: clearActiveGarageCookie,
  })
  redirect("/login")
}


export async function register(formData: FormData) {

  const fullName = formData.get("fullName") as string
  const garageName = formData.get("garageName") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string


  if (
    !fullName ||
    !garageName ||
    !email ||
    !password
  ) {

    throw new Error(
      "Tous les champs sont obligatoires"
    )

  }


  const supabase = await createClient()



  /*
   * 1 - Création du compte utilisateur
   */

  const {
    error: authError

  } = await supabase.auth.signUp({

    email,

    password,

    options: {

      data: {

        full_name: fullName

      }

    }

  })


  if (authError) {

    throw new Error(
      authError.message
    )

  }



  /*
   * 2 - Vérification utilisateur connecté
   */

  const {
    data: {
      user

    }

  } = await supabase.auth.getUser()



  if (!user) {

    throw new Error(
      "Utilisateur non authentifié après inscription"
    )

  }



  /*
   * 3 - Création du garage + owner
   *
   * Cette partie passe par PostgreSQL RPC
   */

  const {

    data: garageId,
    error: garageError

  } = await supabase.rpc(

    "create_garage_onboarding",

    {

      garage_name: garageName

    }

  )



  if (garageError) {

    throw new Error(
      garageError.message
    )

  }

  if (typeof garageId === "string") {
    await persistActiveGarageCookie(garageId)
  }



  /*
   * 4 - Redirection dashboard
   */

  redirect("/dashboard")

}

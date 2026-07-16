"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"


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
    data: authData,
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



  /*
   * 4 - Redirection dashboard
   */

  redirect("/dashboard")

}
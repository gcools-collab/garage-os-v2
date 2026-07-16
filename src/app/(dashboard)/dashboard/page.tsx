import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"


export default async function DashboardPage() {


  const supabase = await createClient()


  const {
    data: {
      user

    }

  } = await supabase.auth.getUser()



  if (!user) {

    redirect("/register")

  }



  const {
    data: membership

  } = await supabase

    .from("garage_members")

    .select(`
      role,
      garages (
        id,
        name
      )
    `)

    .eq(
      "user_id",
      user.id
    )

    .single()



  return (

    <main className="min-h-screen p-8">

      <h1 className="text-3xl font-bold">

        Garage OS

      </h1>


      <p className="mt-4 text-muted-foreground">

        Bienvenue dans votre espace garage

      </p>


      <div className="mt-8 rounded-xl border p-6">

        <h2 className="text-xl font-semibold">

          {membership?.garages?.name}

        </h2>


        <p className="mt-2">

          Rôle :
          {" "}
          {membership?.role}

        </p>

      </div>


    </main>

  )

}
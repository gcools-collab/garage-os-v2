import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LoginForm } from "@/features/auth/login-form"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"

export default async function LoginPage() {
  const session = await getActiveGarageSession()
  if (session) redirect(resolveGarageSessionRoute(session))
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Connexion à Garage OS</CardTitle>
          <CardDescription>Accédez au garage déjà associé à votre compte.</CardDescription>
        </CardHeader>
        <CardContent><LoginForm /></CardContent>
      </Card>
    </main>
  )
}

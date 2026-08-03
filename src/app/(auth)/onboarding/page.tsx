import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createFirstGarage } from "@/features/tenant/actions"
import { getActiveGarageSession, resolveGarageSessionRoute } from "@/features/tenant"

export default async function OnboardingPage() {
  const session = await getActiveGarageSession()
  if (!session) redirect("/auth/recover")
  const destination = resolveGarageSessionRoute(session)
  if (destination !== "/onboarding") redirect(destination)

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Créer votre premier garage</CardTitle>
          <CardDescription>
            Aucun établissement n’est encore associé à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createFirstGarage} className="space-y-4">
            <Input name="garageName" placeholder="Nom du garage" minLength={2} maxLength={120} required />
            <Button type="submit" className="w-full">Créer le garage</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

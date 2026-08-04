import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-12">
      <Card className="w-full text-center">
        <CardHeader>
          <CardTitle>Page introuvable</CardTitle>
          <CardDescription>Cette adresse n’existe pas ou la ressource n’est plus disponible.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild><Link href="/"><ArrowLeft aria-hidden="true" /> Revenir à l’accueil</Link></Button>
        </CardContent>
      </Card>
    </main>
  )
}

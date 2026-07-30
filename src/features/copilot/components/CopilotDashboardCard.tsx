import Link from "next/link"
import { Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function CopilotDashboardCard() {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Bot className="size-5" aria-hidden="true" /> Demander au Copilote</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">Comprenez vos priorités, votre stock et votre activité commerciale.</p>
        <Button asChild variant="outline"><Link href="/copilot">Ouvrir le Copilote</Link></Button>
      </CardContent>
    </Card>
  )
}

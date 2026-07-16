import { Bot, RadioTower, Search } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export function ComingSoon() {
  const modules = [
    { name: "Market Intelligence", icon: Search },
    { name: "Assistant IA", icon: Bot },
    { name: "Multidiffusion", icon: RadioTower },
  ]

  return (
    <section aria-labelledby="coming-soon-title">
      <h2 id="coming-soon-title" className="mb-3 text-sm font-medium text-muted-foreground">
        Bientôt dans Garage OS
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map(({ name, icon: Icon }) => (
          <Card key={name} className="bg-muted/30 text-muted-foreground shadow-none">
            <CardContent className="flex items-center gap-3">
              <span className="rounded-lg bg-muted p-2">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium text-foreground/70">{name}</p>
                <p className="text-xs">En préparation</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}

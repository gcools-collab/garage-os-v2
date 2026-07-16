import { Check } from "lucide-react"

const steps = [
  "Importer l’annonce",
  "Vérifier et compléter",
  "Créer le véhicule",
] as const

export function AcquisitionProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Progression de l'import" className="rounded-xl border bg-white p-4 sm:p-5">
      <ol className="grid gap-3 sm:grid-cols-3 sm:gap-0">
        {steps.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3
          const completed = step < currentStep
          const current = step === currentStep

          return (
            <li
              key={label}
              className="relative flex items-center gap-3 sm:flex-col sm:text-center"
              aria-current={current ? "step" : undefined}
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={`absolute right-1/2 top-4 hidden h-px w-full sm:block ${
                    completed || current ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <span
                className={`relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                  completed || current
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                {completed ? <Check className="size-4" /> : step}
              </span>
              <span
                className={
                  current ? "text-sm font-semibold" : "text-sm text-muted-foreground"
                }
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

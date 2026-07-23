import Link from "next/link"
import type { NavigationItem } from "../../types"

const variants = {
  primary:
    "border-transparent bg-[var(--live-primary)] text-[var(--live-primary-foreground)] hover:opacity-90 active:scale-[0.98]",
  secondary:
    "border-[var(--live-border)] bg-transparent text-[var(--live-foreground)] hover:bg-[var(--live-muted)] active:scale-[0.98]",
} as const

export function LiveButton({
  action,
  variant = "primary",
}: {
  action: NavigationItem
  variant?: keyof typeof variants
}) {
  return (
    <Link
      href={action.href}
      target={action.external ? "_blank" : undefined}
      rel={action.external ? "noreferrer" : undefined}
      className={`inline-flex min-h-11 items-center justify-center rounded-[var(--live-control-radius)] border px-5 py-2.5 text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--live-primary)] motion-reduce:transform-none motion-reduce:transition-none ${variants[variant]}`}
    >
      {action.label}
    </Link>
  )
}

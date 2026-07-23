import Link from "next/link"
import type { GarageConfig } from "../../types"

export function Header({ garage }: { garage: GarageConfig }) {
  return (
    <header className="border-b border-[var(--live-border)] bg-[var(--live-background)]">
      <div className="mx-auto flex min-h-18 max-w-[var(--live-content-width)] items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {garage.name}
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-6 md:flex">
          {garage.navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              className="text-sm text-[var(--live-muted-foreground)] transition-colors hover:text-[var(--live-foreground)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}

import type { LiveGarageViewModel } from "../../types"

export function Footer({ garage }: { garage: LiveGarageViewModel }) {
  return (
    <footer
      id="contact"
      className="border-t border-[var(--live-border)] bg-[var(--live-surface)] text-[var(--live-surface-foreground)]"
    >
      <div className="mx-auto flex max-w-[var(--live-content-width)] flex-col gap-3 px-5 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} {garage.siteName}</p>
        <p className="text-[var(--live-muted-foreground)]">
          {garage.address.postalCode} {garage.address.city}, {garage.address.country}
        </p>
      </div>
    </footer>
  )
}

import type { HeroConfig } from "../../types"

export function HeroPlaceholder({ hero }: { hero: HeroConfig }) {
  return (
    <section className="mx-auto flex min-h-[34rem] max-w-[var(--live-content-width)] items-center px-5 py-20 sm:px-8">
      <div className="w-full rounded-[var(--live-card-radius)] border border-dashed border-[var(--live-border)] bg-[var(--live-surface)] px-6 py-20 text-center sm:px-12">
        {hero.eyebrow && (
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--live-muted-foreground)]">
            {hero.eyebrow}
          </p>
        )}
        <h1 className="mt-4 text-3xl font-[var(--live-heading-weight)] tracking-tight sm:text-5xl">
          {hero.title}
        </h1>
        {hero.description && (
          <p className="mx-auto mt-4 max-w-2xl text-[var(--live-muted-foreground)]">
            {hero.description}
          </p>
        )}
      </div>
    </section>
  )
}

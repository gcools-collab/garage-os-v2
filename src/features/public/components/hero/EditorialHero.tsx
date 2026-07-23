import type { HeroContent } from "../../types"
import { HeroCopyBlock } from "./hero-parts"

type EditorialHeroContent = Extract<HeroContent, { mode: "editorial" }>

export function EditorialHero({ hero }: { hero: EditorialHeroContent }) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden bg-[var(--live-background)] px-5 py-20 sm:px-8">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[min(80vw,50rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--live-border)] bg-[var(--live-surface)] opacity-60"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[min(55vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--live-border)] bg-[var(--live-muted)] opacity-50"
      />
      <div className="mx-auto w-full max-w-[var(--live-content-width)]">
        <HeroCopyBlock hero={hero} centered />
      </div>
    </section>
  )
}

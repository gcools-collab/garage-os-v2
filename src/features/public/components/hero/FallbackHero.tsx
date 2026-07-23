import type { HeroContent } from "../../types"
import { HeroCopyBlock } from "./hero-parts"

type FallbackHeroContent = Extract<HeroContent, { mode: "fallback" }>

export function FallbackHero({ hero }: { hero: FallbackHeroContent }) {
  return (
    <section className="flex min-h-[32rem] items-center bg-[var(--live-background)] px-5 py-16 sm:px-8">
      <div className="mx-auto w-full max-w-[var(--live-content-width)] rounded-[var(--live-card-radius)] border border-[var(--live-border)] bg-[var(--live-surface)] px-6 py-14 sm:px-10 sm:py-20">
        <HeroCopyBlock hero={hero} />
      </div>
    </section>
  )
}

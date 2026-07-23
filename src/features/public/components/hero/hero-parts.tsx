import type { HeroContent } from "../../types"
import { LiveButton, TrustItem } from "../ui"

type HeroCopy = Pick<
  HeroContent,
  | "eyebrow"
  | "title"
  | "description"
  | "primaryAction"
  | "secondaryAction"
  | "trustItems"
>

export function HeroCopyBlock({
  hero,
  centered = false,
}: {
  hero: HeroCopy
  centered?: boolean
}) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      {hero.eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--live-muted-foreground)]">
          {hero.eyebrow}
        </p>
      )}
      <h1 className="mt-5 text-4xl font-[var(--live-heading-weight)] leading-[1.04] tracking-[-0.04em] text-balance sm:text-5xl lg:text-6xl xl:text-7xl">
        {hero.title}
      </h1>
      {hero.description && (
        <p className={`mt-6 text-base leading-7 text-[var(--live-muted-foreground)] sm:text-lg ${centered ? "mx-auto max-w-2xl" : "max-w-xl"}`}>
          {hero.description}
        </p>
      )}
      {(hero.primaryAction || hero.secondaryAction) && (
        <div className={`mt-8 flex flex-col gap-3 min-[400px]:flex-row ${centered ? "justify-center" : ""}`}>
          {hero.primaryAction && <LiveButton action={hero.primaryAction} />}
          {hero.secondaryAction && (
            <LiveButton action={hero.secondaryAction} variant="secondary" />
          )}
        </div>
      )}
      {hero.trustItems.length > 0 && (
        <ul className={`mt-9 flex flex-wrap gap-x-5 gap-y-3 ${centered ? "justify-center" : ""}`}>
          {hero.trustItems.map((item) => (
            <TrustItem key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

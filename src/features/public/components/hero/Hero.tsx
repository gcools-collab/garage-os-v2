import type { HeroContent } from "../../types"
import { EditorialHero } from "./EditorialHero"
import { FallbackHero } from "./FallbackHero"
import { VehicleHero } from "./VehicleHero"

export function Hero({ hero }: { hero: HeroContent }) {
  switch (hero.mode) {
    case "vehicle":
      return <VehicleHero hero={hero} />
    case "editorial":
      return <EditorialHero hero={hero} />
    case "fallback":
      return <FallbackHero hero={hero} />
  }
}

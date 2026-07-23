import { getGarageConfig, HeroPlaceholder } from "@/features/public"

export default function LiveLandingPage() {
  return <HeroPlaceholder hero={getGarageConfig().hero} />
}

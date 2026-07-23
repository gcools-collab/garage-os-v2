import {
  getLiveHomepage,
  HeroPlaceholder,
  PublicLayout,
} from "@/features/public"

export default function LiveLandingPage() {
  const homepage = getLiveHomepage()

  return (
    <PublicLayout
      garage={homepage.garage}
      navigation={homepage.navigation}
      theme={homepage.theme}
    >
      <HeroPlaceholder hero={homepage.hero} />
    </PublicLayout>
  )
}

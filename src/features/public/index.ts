export { HeroPlaceholder } from "./components/hero"
export { Footer, Header, PublicLayout } from "./components/layout"
export {
  createLiveEngine,
  getFeaturedVehicles,
  getGarageConfig,
  getHeroContent,
  getHeroVehicle,
  getLiveHomepage,
  getVisibleCollections,
  getVisibleServices,
} from "./lib/live-engine"
export { defaultTheme } from "./theme"
export type {
  Collection,
  GarageConfig,
  HeroContent,
  HeroConfig,
  LiveEngineData,
  LiveHomepage,
  LiveModuleConfig,
  LiveModuleId,
  NavigationItem,
  Service,
  Theme,
  Vehicle,
  VisibleCollection,
} from "./types"

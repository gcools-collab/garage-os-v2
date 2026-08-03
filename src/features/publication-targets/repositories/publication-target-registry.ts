import type { PublicationTargetProvider } from "../contracts"
import {
  FacebookMarketplaceProvider,
  InstagramProvider,
  LaCentraleProvider,
  LeboncoinProvider,
  PartnerApiProvider,
  PublicWebsiteProvider,
} from "../providers"
import type { PublicationTargetId } from "../types"

export class PublicationTargetRegistry {
  private readonly providers: readonly PublicationTargetProvider[]

  constructor(providers: readonly PublicationTargetProvider[] = [
    new PublicWebsiteProvider(),
    new LeboncoinProvider(),
    new LaCentraleProvider(),
    new FacebookMarketplaceProvider(),
    new InstagramProvider(),
    new PartnerApiProvider(),
  ]) {
    this.providers = [...providers]
  }

  list(): readonly PublicationTargetProvider[] {
    return this.providers
  }

  select(ids: readonly PublicationTargetId[]): readonly PublicationTargetProvider[] {
    const requested = new Set(ids)
    return this.providers.filter((provider) => requested.has(provider.target.id))
  }
}

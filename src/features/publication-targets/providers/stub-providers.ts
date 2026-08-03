import { NotImplementedPublicationTargetProvider } from "./not-implemented-provider"

export class LeboncoinProvider extends NotImplementedPublicationTargetProvider {
  constructor() {
    super({ id: "LEBONCOIN", name: "Leboncoin", description: "Diffusion automobile Leboncoin.", capabilities: ["PHOTOS", "PRICE", "DESCRIPTION", "EQUIPMENT", "CONTACT"] })
  }
}

export class LaCentraleProvider extends NotImplementedPublicationTargetProvider {
  constructor() {
    super({ id: "LA_CENTRALE", name: "La Centrale", description: "Diffusion automobile La Centrale.", capabilities: ["PHOTOS", "PRICE", "DESCRIPTION", "EQUIPMENT", "CONTACT", "FINANCING"] })
  }
}

export class FacebookMarketplaceProvider extends NotImplementedPublicationTargetProvider {
  constructor() {
    super({ id: "FACEBOOK_MARKETPLACE", name: "Facebook Marketplace", description: "Diffusion sur Facebook Marketplace.", capabilities: ["PHOTOS", "VIDEO", "PRICE", "DESCRIPTION", "CONTACT"] })
  }
}

export class InstagramProvider extends NotImplementedPublicationTargetProvider {
  constructor() {
    super({ id: "INSTAGRAM", name: "Instagram", description: "Présentation sociale du véhicule.", capabilities: ["PHOTOS", "VIDEO", "DESCRIPTION", "CONTACT"] })
  }
}

export class PartnerApiProvider extends NotImplementedPublicationTargetProvider {
  constructor() {
    super({ id: "PARTNER_API", name: "API partenaire", description: "Contrat générique pour les partenaires.", capabilities: ["PHOTOS", "VIDEO", "360", "PRICE", "DESCRIPTION", "EQUIPMENT", "SEO", "CONTACT", "FINANCING", "REPRISE"] })
  }
}

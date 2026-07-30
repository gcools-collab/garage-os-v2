import { buildAssetSeoViewModel, type VehicleAssetGallery } from "@/features/media"
import type { LiveStockVehicle } from "@/features/live-stock"
import type { GaragePublicViewModel } from "../../types"
import type { VehicleDetailSeoViewModel } from "../presentation"

export class VehicleSEOBuilder {
  build(input: {
    readonly vehicle: LiveStockVehicle
    readonly garage: GaragePublicViewModel
    readonly media: VehicleAssetGallery
  }): VehicleDetailSeoViewModel {
    const { vehicle, garage, media } = input
    const canonicalPath = `${garage.homeHref}/vehicules/${vehicle.slug}`
    const title = `${vehicle.make} ${vehicle.model}${vehicle.version ? ` ${vehicle.version}` : ""}`
    const description = [
      title,
      vehicle.year,
      vehicle.mileageKm === null ? null : `${vehicle.mileageKm.toLocaleString("fr-FR")} km`,
      `proposé par ${garage.name}`,
    ].filter(Boolean).join(", ")
    const imageJsonLd = buildAssetSeoViewModel(media.cover)
    return {
      title: `${title} | ${garage.name}`,
      description,
      canonicalPath,
      openGraphImage: imageJsonLd?.openGraphImage ?? garage.logoUrl,
      twitterImage: imageJsonLd?.twitterImage ?? garage.logoUrl,
      breadcrumbJsonLd: {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Accueil", item: garage.homeHref },
          { "@type": "ListItem", position: 2, name: "Stock", item: `${garage.homeHref}/stock` },
          { "@type": "ListItem", position: 3, name: title, item: canonicalPath },
        ],
      },
      vehicleJsonLd: {
        "@context": "https://schema.org",
        "@type": "Vehicle",
        name: title,
        brand: { "@type": "Brand", name: vehicle.make },
        model: vehicle.model,
        vehicleModelDate: vehicle.year,
        mileageFromOdometer: vehicle.mileageKm === null ? undefined : {
          "@type": "QuantitativeValue",
          value: vehicle.mileageKm,
          unitCode: "KMT",
        },
        fuelType: vehicle.fuelType,
        vehicleTransmission: vehicle.transmission,
        color: vehicle.color,
        image: imageJsonLd?.openGraphImage,
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          priceCurrency: "EUR",
          price: vehicle.priceCents === null ? undefined : vehicle.priceCents / 100,
          url: canonicalPath,
          seller: { "@type": "AutoDealer", name: garage.name },
        },
      },
      imageJsonLd,
      localBusinessJsonLd: {
        "@context": "https://schema.org",
        "@type": ["AutoDealer", "LocalBusiness"],
        name: garage.name,
        address: garage.address,
        telephone: garage.phone,
        email: garage.email,
        url: garage.homeHref,
      },
    }
  }
}

import type { PublicHomepageViewModel } from "@/features/public-site/types"
import type { PremiumHomepageViewModel, PremiumSectionHeadingViewModel } from "../presentation"

const heading = (eyebrow: string, title: string, description: string): PremiumSectionHeadingViewModel => ({ eyebrow, title, description })
export class PremiumHomepageBuilder {
  build(homepage: PublicHomepageViewModel): PremiumHomepageViewModel {
    const home = homepage.garage.homeHref
    const stock = `${home}/stock`
    const contact = `${home}/contact`
    const phoneHref = homepage.garage.phone ? `tel:${homepage.garage.phone.replace(/\s/g, "")}` : null
    const years = homepage.quickSearch.years
    const serviceIds = new Set(homepage.garage.services.map((service) => service.id))
    const appointmentActions = [
      serviceIds.has("VEHICLE_SALES") ? { label: "Voir / essayer un véhicule", href: `${contact}?project=test-drive` } : null,
      serviceIds.has("ENGINE_CLEANING") ? { label: "Décalaminage", href: `${contact}?project=engine-cleaning` } : null,
      serviceIds.has("REGISTRATION") ? { label: "Carte grise", href: `${contact}?project=registration` } : null,
    ].filter((action): action is NonNullable<typeof action> => action !== null)
    const contactActions = [
      phoneHref ? { label: "Appeler", href: phoneHref } : null,
      homepage.garage.email ? { label: "Envoyer un e-mail", href: `mailto:${homepage.garage.email}` } : null,
      homepage.garage.address ? { label: "Itinéraire", href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(homepage.garage.address)}` } : null,
      { label: "Formulaire de contact", href: contact },
    ].filter((action): action is NonNullable<typeof action> => action !== null)
    return {
      garage: homepage.garage,
      hero: { eyebrow: homepage.hero.eyebrow, title: homepage.hero.title, description: homepage.hero.description, image: homepage.hero.image, actions: [{ label: "Découvrir nos véhicules", href: stock }] },
      search: { action: stock, submitLabel: "Afficher les véhicules", fields: [
        { name: "brand", label: "Marque", type: "select", options: homepage.quickSearch.brands, placeholder: "Toutes les marques" },
        { name: "model", label: "Modèle", type: "select", options: homepage.quickSearch.models, placeholder: "Tous les modèles" },
        { name: "maxPrice", label: "Budget maximum", type: "number", options: [], placeholder: "Ex. 30 000 €" },
        { name: "fuel", label: "Énergie", type: "select", options: homepage.quickSearch.fuels, placeholder: "Toutes les énergies" },
        { name: "gearbox", label: "Boîte", type: "select", options: homepage.quickSearch.gearboxes, placeholder: "Toutes les boîtes" },
        { name: "minYear", label: "Année minimum", type: "select", options: years, placeholder: "Toutes les années" },
        { name: "maxMileage", label: "Kilométrage maximum", type: "number", options: [], placeholder: "Ex. 80 000 km" },
      ] },
      featured: { heading: heading("", "", ""), vehicle: null },
      latest: { heading: heading("Stock disponible", "Nos véhicules disponibles", "Découvrez les véhicules actuellement publiés par le garage."), vehicles: homepage.latestVehicles.slice(0, 6) },
      services: { heading: heading("À vos côtés", "Nos services", "Uniquement les services actuellement proposés par notre équipe."), items: homepage.garage.services.map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description,
        icon: service.icon === "SHIELD" ? "SHIELD" as const : service.icon === "FILE" ? "WALLET" as const : "CAR" as const,
        action: { label: service.actionLabel, href: service.href },
      })) },
      whyUs: { heading: heading("Notre engagement", `Pourquoi choisir ${homepage.garage.name}`, "Une expérience automobile transparente, exigeante et humaine."), items: [
        { id: "selection", title: "Sélection exigeante", description: "Des véhicules présentés avec leurs informations essentielles.", icon: "SPARKLES" },
        { id: "trust", title: "Relation de confiance", description: "Des échanges clairs et un accompagnement personnalisé.", icon: "SHIELD" },
        { id: "local", title: "Présence locale", description: homepage.garage.address ?? "Une équipe disponible pour vous recevoir.", icon: "MAP" },
      ] },
      tradeIn: { heading: heading("Changez simplement", "Faites reprendre votre véhicule", "Présentez-nous votre véhicule actuel et avançons ensemble sur votre prochain achat."), action: { label: "Demander une reprise", href: `${contact}?project=trade-in` } },
      reviews: { heading: heading("Expérience client", "La confiance se construit", "Les avis vérifiés seront affichés lorsqu’ils seront disponibles."), available: false, message: "Aucun avis public vérifié pour le moment." },
      metrics: [],
      primaryCta: { title: "Votre prochain véhicule vous attend peut-être ici.", description: "Parcourez notre sélection ou échangez directement avec notre équipe.", actions: [{ label: "Découvrir nos véhicules", href: stock }, { label: "Nous contacter", href: contact }] },
      contact: { title: `Rencontrez l’équipe ${homepage.garage.name}`, description: "Une question, un essai ou un projet de reprise ? Contactez-nous.", phone: phoneHref ? { label: homepage.garage.phone ?? "Appeler", href: phoneHref } : null, email: homepage.garage.email ? { label: homepage.garage.email, href: `mailto:${homepage.garage.email}` } : null, address: homepage.garage.address, action: { label: "Nous contacter", href: contact } },
      floatingCta: [{ id: "APPOINTMENT" as const, label: "Prendre rendez-vous", href: "#customer-appointment", enabled: appointmentActions.length > 0 }, { id: "CONTACT" as const, label: "Nous contacter", href: "#customer-contact", enabled: true }],
      appointmentActions,
      contactActions,
      animation: { reveal: "FADE_SLIDE", stagger: true, reducedMotion: true },
    }
  }
}

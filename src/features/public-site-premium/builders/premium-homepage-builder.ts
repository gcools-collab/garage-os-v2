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
    return {
      garage: homepage.garage,
      hero: { eyebrow: homepage.hero.eyebrow, title: homepage.hero.title, description: homepage.hero.description, image: homepage.hero.image, actions: [
        { label: "Voir le stock", href: stock }, { label: "Nous contacter", href: contact }, { label: "Faire reprendre mon véhicule", href: `${contact}?project=trade-in` },
      ] },
      search: { action: stock, submitLabel: "Afficher les véhicules", fields: [
        { name: "brand", label: "Marque", type: "select", options: homepage.quickSearch.brands, placeholder: "Toutes les marques" },
        { name: "model", label: "Modèle", type: "select", options: homepage.quickSearch.models, placeholder: "Tous les modèles" },
        { name: "maxPrice", label: "Budget maximum", type: "number", options: [], placeholder: "Ex. 30 000 €" },
        { name: "fuel", label: "Énergie", type: "select", options: homepage.quickSearch.fuels, placeholder: "Toutes les énergies" },
        { name: "gearbox", label: "Boîte", type: "select", options: homepage.quickSearch.gearboxes, placeholder: "Toutes les boîtes" },
        { name: "minYear", label: "Année minimum", type: "select", options: years, placeholder: "Toutes les années" },
        { name: "maxMileage", label: "Kilométrage maximum", type: "number", options: [], placeholder: "Ex. 80 000 km" },
      ] },
      featured: { heading: heading("Notre sélection", "Le véhicule à découvrir", "Une automobile choisie pour son caractère, sa présentation et sa disponibilité."), vehicle: homepage.featuredVehicles[0] ?? null },
      latest: { heading: heading("Nouveautés", "Dernières arrivées", "Découvrez les véhicules récemment publiés par notre équipe."), vehicles: homepage.latestVehicles },
      services: { heading: heading("À vos côtés", "Nos services", "Un accompagnement complet avant, pendant et après votre achat."), items: [
        { id: "financing", title: "Financement", description: "Préparez une solution adaptée à votre projet et à votre budget.", icon: "WALLET" },
        { id: "trade-in", title: "Reprise", description: "Faites étudier votre véhicule actuel par notre équipe.", icon: "CAR" },
        { id: "support", title: "Accompagnement", description: "Un interlocuteur disponible à chaque étape de votre projet.", icon: "HANDSHAKE" },
      ] },
      whyUs: { heading: heading("Notre engagement", `Pourquoi choisir ${homepage.garage.name}`, "Une expérience automobile transparente, exigeante et humaine."), items: [
        { id: "selection", title: "Sélection exigeante", description: "Des véhicules présentés avec leurs informations essentielles.", icon: "SPARKLES" },
        { id: "trust", title: "Relation de confiance", description: "Des échanges clairs et un accompagnement personnalisé.", icon: "SHIELD" },
        { id: "local", title: "Présence locale", description: homepage.garage.address ?? "Une équipe disponible pour vous recevoir.", icon: "MAP" },
      ] },
      financing: { heading: heading("Votre budget", "Un financement pensé avec vous", "Échangez avec notre équipe pour préparer votre projet automobile."), action: { label: "Étudier mon financement", href: `${contact}?project=financing` } },
      tradeIn: { heading: heading("Changez simplement", "Faites reprendre votre véhicule", "Présentez-nous votre véhicule actuel et avançons ensemble sur votre prochain achat."), action: { label: "Demander une reprise", href: `${contact}?project=trade-in` } },
      reviews: { heading: heading("Expérience client", "La confiance se construit", "Les avis vérifiés seront affichés lorsqu’ils seront disponibles."), available: false, message: "Aucun avis public vérifié pour le moment." },
      metrics: [{ id: "stock", value: String(homepage.vehicleCount), label: "véhicules à découvrir" }, { id: "contact", value: "1", label: "équipe dédiée" }, { id: "support", value: "100 %", label: "d’accompagnement humain" }],
      primaryCta: { title: "Votre prochain véhicule vous attend peut-être ici.", description: "Parcourez notre sélection ou échangez directement avec notre équipe.", actions: [{ label: "Découvrir le stock", href: stock }, { label: "Parler à un conseiller", href: contact }] },
      contact: { title: `Rencontrez l’équipe ${homepage.garage.name}`, description: "Une question, un essai ou un projet de reprise ? Contactez-nous.", phone: phoneHref ? { label: homepage.garage.phone ?? "Appeler", href: phoneHref } : null, email: homepage.garage.email ? { label: homepage.garage.email, href: `mailto:${homepage.garage.email}` } : null, address: homepage.garage.address, action: { label: "Nous contacter", href: contact } },
      floatingCta: [phoneHref ? { id: "PHONE" as const, label: "Appeler", href: phoneHref, enabled: true } : null, { id: "CONTACT" as const, label: "Demande d’information", href: contact, enabled: true }, { id: "TRADE_IN" as const, label: "Reprise", href: `${contact}?project=trade-in`, enabled: true }].filter((action): action is NonNullable<typeof action> => action !== null),
      animation: { reveal: "FADE_SLIDE", stagger: true, reducedMotion: true },
    }
  }
}

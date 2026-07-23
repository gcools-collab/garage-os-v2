import type { Service } from "../types"

export const services: Service[] = [
  {
    id: "vehicle-search",
    slug: "recherche-personnalisee",
    name: "Recherche personnalisée",
    description: "Nous recherchons le véhicule adapté à vos critères.",
    icon: "search",
    active: true,
    public: true,
    featured: true,
    order: 1,
  },
  {
    id: "trade-in",
    slug: "reprise",
    name: "Reprise",
    description: "Une estimation claire et un accompagnement pour votre reprise.",
    icon: "refresh",
    active: true,
    public: true,
    featured: false,
    order: 2,
  },
  {
    id: "financing",
    slug: "financement",
    name: "Financement",
    description: "Des solutions adaptées à votre projet automobile.",
    icon: "credit-card",
    active: true,
    public: true,
    featured: false,
    order: 3,
  },
]

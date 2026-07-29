import type { MarketListing } from "../engine"

const models = [
  ["BMW", "M3", "Essence", "Automatique"],
  ["Audi", "A4", "Diesel", "Automatique"],
  ["Mercedes", "Classe C", "Diesel", "Automatique"],
  ["Peugeot", "308", "Diesel", "Manuelle"],
  ["Renault", "Clio", "Essence", "Manuelle"],
] as const

export const marketListingsFixture: MarketListing[] = Array.from({ length: 30 }, (_, index) => {
  const [brand, model, fuel, gearbox] = models[index % models.length]
  const reference = index === 0
    ? { year: 2015, mileage: 150_000, price: 39_900 }
    : index === 3
      ? { year: 2020, mileage: 72_000, price: 22_500 }
      : index === 4
        ? { year: 2021, mileage: 48_000, price: 19_500 }
        : null
  return {
    id: `market-${index + 1}`,
    source: "fixture",
    brand,
    model,
    fuel,
    gearbox,
    year: reference?.year ?? 2014 + (index % 7),
    mileage: reference?.mileage ?? 45_000 + index * 4_500,
    price: reference?.price ?? 14_000 + (index % 5) * 6_000 + index * 250,
    title: `${brand} ${model}`,
    city: index % 2 ? "Lille" : "Valenciennes",
  }
})

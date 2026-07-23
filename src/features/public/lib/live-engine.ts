import { collections, garage, services, vehicles } from "../data"
import type { Collection, GarageConfig, Service, Vehicle } from "../types"

export function getGarageConfig(): GarageConfig {
  return garage
}

export function getHeroVehicle(): Vehicle | null {
  const configuredVehicleId = garage.hero.featuredVehicleId
  if (!configuredVehicleId) return vehicles.find((vehicle) => vehicle.featured) ?? null
  return vehicles.find((vehicle) => vehicle.id === configuredVehicleId) ?? null
}

export function getFeaturedVehicles(): Vehicle[] {
  return vehicles.filter((vehicle) => vehicle.featured)
}

export function getCollections(): Collection[] {
  return [...collections].sort((first, second) => first.order - second.order)
}

export function getServices(): Service[] {
  return [...services].sort((first, second) => first.order - second.order)
}

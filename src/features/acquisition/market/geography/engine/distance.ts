import type { GeoPoint } from "../types"

const EARTH_RADIUS_KM = 6_371.0088

function radians(value: number) {
  return value * Math.PI / 180
}

export function calculateDistanceKm(origin: GeoPoint, destination: GeoPoint): number {
  const latitudeDelta = radians(destination.latitude - origin.latitude)
  const longitudeDelta = radians(destination.longitude - origin.longitude)
  const originLatitude = radians(origin.latitude)
  const destinationLatitude = radians(destination.latitude)
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude)
    * Math.sin(longitudeDelta / 2) ** 2
  return Math.round(
    EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) * 10
  ) / 10
}

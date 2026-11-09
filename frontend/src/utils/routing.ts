// Straight-line distance/bearing + OSRM driving route (free, no API key).
// OSRM demo server: CORS-enabled. Falls back to a straight dashed line.

export interface LatLng { lat: number; lng: number }
export interface RouteResult {
  distanceKm: number
  durationMin: number
  path: LatLng[]
  roadRoute: boolean
}

const R = 6371 // km

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export function bearingLabel(a: LatLng, b: LatLng): string {
  const y = Math.sin(((b.lng - a.lng) * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180)
  const x = Math.cos((a.lat * Math.PI) / 180) * Math.sin((b.lat * Math.PI) / 180) - Math.sin((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.cos(((b.lng - a.lng) * Math.PI) / 180)
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

export async function getDrivingRoute(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<RouteResult> {
  const straight: RouteResult = { distanceKm: haversineKm(from, to), durationMin: 0, path: [from, to], roadRoute: false }
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
    if (!res.ok) return straight
    const data = (await res.json()) as any
    const route = data?.routes?.[0]
    if (!route?.geometry?.coordinates?.length) return straight
    return {
      distanceKm: Number(route.distance) / 1000,
      durationMin: Math.round(Number(route.duration) / 60),
      path: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => ({ lat, lng })),
      roadRoute: true,
    }
  } catch {
    return straight
  }
}

export function googleDirectionsUrl(from: LatLng, to: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}`
}

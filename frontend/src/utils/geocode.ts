// Nominatim (OpenStreetMap) geocoding — free, no API key, CORS-enabled.
// Biased to the Philippines. Usage policy: max 1 req/sec — callers debounce.

export interface AddressParts {
  road?: string
  suburb?: string
  city?: string
  state?: string
  region?: string
  postcode?: string
}

export interface GeoResult {
  lat: number
  lng: number
  displayName: string
  address: AddressParts
}

const PH_VIEWBOX = '116.9,5.1,126.6,18.6' // lon1,lat1,lon2,lat2

export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 4) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ph&viewbox=${PH_VIEWBOX}&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const data = (await res.json()) as any[]
  return (data || [])
    .map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), displayName: String(r.display_name || ''), address: pickParts(r.address || {}) }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.displayName)
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<{ displayName: string; address: AddressParts } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = (await res.json()) as any
  if (!data?.display_name) return null
  return { displayName: String(data.display_name), address: pickParts(data.address || {}) }
}

function pickParts(a: Record<string, string>): AddressParts {
  return {
    road: a.road || a.footway || a.path,
    suburb: a.suburb || a.quarter || a.neighbourhood || a.village || a.hamlet,
    city: a.city || a.town || a.county,
    state: a.state || a.province,
    region: a.region,
    postcode: a.postcode,
  }
}

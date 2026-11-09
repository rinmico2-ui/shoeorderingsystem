import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface LatLng { lat: number; lng: number }

const DEFAULT_CENTER: LatLng = { lat: 14.5995, lng: 120.9842 } // Manila, PH

function pinIcon() {
  return L.divIcon({
    className: 'kc-pin',
    html: '<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:#202020;border:3px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
    iconSize: [26, 26],
    iconAnchor: [13, 22],
  })
}

/**
 * Interactive delivery pin picker (checkout) or read-only viewer (admin / tracking).
 * Pure Leaflet + OpenStreetMap street tiles — no API key required.
 */
function originIcon() {
  return L.divIcon({
    className: 'kc-origin',
    html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

export function DeliveryMap({
  value,
  onChange,
  readOnly = false,
  className = 'h-64',
  origin = null,
  routePath = null,
}: {
  value: LatLng | null
  onChange?: (ll: LatLng) => void
  readOnly?: boolean
  className?: string
  origin?: LatLng | null
  routePath?: LatLng[] | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const originRef = useRef<L.Marker | null>(null)
  const routeRef = useRef<L.Polyline | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const readOnlyRef = useRef(readOnly)

  useEffect(() => {
    if (!containerRef.current) return
    const start = value ?? DEFAULT_CENTER
    const map = L.map(containerRef.current, { zoomControl: true, attributionControl: true }).setView([start.lat, start.lng], value ? 16 : 11)
    mapRef.current = map
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    if (value) markerRef.current = L.marker([value.lat, value.lng], { icon: pinIcon(), draggable: !readOnlyRef.current }).addTo(map)
    if (!readOnlyRef.current) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const ll = { lat: e.latlng.lat, lng: e.latlng.lng }
        if (markerRef.current) markerRef.current.setLatLng([ll.lat, ll.lng])
        else {
          const m = L.marker([ll.lat, ll.lng], { icon: pinIcon(), draggable: true }).addTo(map)
          m.on('dragend', () => {
            const d = m.getLatLng()
            onChangeRef.current?.({ lat: d.lat, lng: d.lng })
          })
          markerRef.current = m
        }
        onChangeRef.current?.(ll)
      })
    }
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      originRef.current = null
      routeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Origin marker (staff/admin current location) + route polyline.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (origin) {
      if (originRef.current) originRef.current.setLatLng([origin.lat, origin.lng])
      else originRef.current = L.marker([origin.lat, origin.lng], { icon: originIcon(), title: 'Your location' }).addTo(map)
    } else if (originRef.current) {
      map.removeLayer(originRef.current)
      originRef.current = null
    }
    if (routePath && routePath.length >= 2) {
      const pts: [number, number][] = routePath.map((p) => [p.lat, p.lng])
      if (routeRef.current) routeRef.current.setLatLngs(pts)
      else routeRef.current = L.polyline(pts, { color: '#2563eb', weight: 4, opacity: 0.85 }).addTo(map)
      map.fitBounds(L.latLngBounds(pts), { padding: [24, 24] })
    } else if (routeRef.current) {
      map.removeLayer(routeRef.current)
      routeRef.current = null
    }
  }, [origin, routePath])

  // Sync marker/map when value changes from outside (search select, geolocate)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (value) {
      if (markerRef.current) markerRef.current.setLatLng([value.lat, value.lng])
      else if (!readOnly) markerRef.current = L.marker([value.lat, value.lng], { icon: pinIcon(), draggable: true }).addTo(map)
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 16))
      // Attaching a new dragend listener after the marker exists
      if (markerRef.current && !readOnly) {
        const m = markerRef.current
        m.off('dragend')
        m.on('dragend', () => {
          const ll = m.getLatLng()
          onChangeRef.current?.({ lat: ll.lat, lng: ll.lng })
        })
      }
    } else if (markerRef.current) {
      map.removeLayer(markerRef.current)
      markerRef.current = null
    }
  }, [value, readOnly])

  return (
    <div>
      <div ref={containerRef} className={`${className} z-0 w-full overflow-hidden rounded-md border border-brand-border`} role="application" aria-label={readOnly ? 'Delivery location map' : 'Delivery location picker. Search an address or tap the map to drop your pin.'} />
      {/* Leaflet panes outrank Tailwind overlays — keep the map below sticky bars */}
      {!readOnly && (
        <p className="mt-2 text-xs text-ink-secondary">Tap the map (or drag the pin) to mark your exact delivery spot. Your pin is shared only with store staff for delivery.</p>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ExternalLink, LocateFixed, MapPin, Route as RouteIcon } from 'lucide-react'
import { api } from '@/services/api'
import { fmt } from '@/utils/format'
import { StatusBadge } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { Modal } from '@/components/overlay'
import { DeliveryMap } from '@/components/DeliveryMap'
import { bearingLabel, getDrivingRoute, googleDirectionsUrl, haversineKm, type RouteResult } from '@/utils/routing'

function locationOf(o: any): { lat: number; lng: number } | null {
  const addr = o?.shippingAddress || {}
  const lat = Number(addr.lat)
  const lng = Number(addr.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

const NEXT: Record<string, string[]> = { PENDING: ['PROCESSING', 'CANCELLED'], AWAITING_PAYMENT: ['PAYMENT_VERIFIED', 'CANCELLED'], PAYMENT_VERIFIED: ['PROCESSING', 'CANCELLED'], PROCESSING: ['READY_TO_SHIP', 'CANCELLED'], READY_TO_SHIP: ['SHIPPED'], SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED'], OUT_FOR_DELIVERY: ['DELIVERED'], DELIVERED: ['REFUND_REQUESTED'], REFUND_REQUESTED: ['REFUNDED'] }

export function AdminOrdersPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['adminOrders'], queryFn: () => api.get<any>('/admin/orders'), retry: false })
  const [pending, setPending] = useState<{ id: string; status: string; orderNumber: string } | null>(null)
  const [mapOrder, setMapOrder] = useState<any>(null)
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [locating, setLocating] = useState(false)
  const routeCtrlRef = useRef<AbortController | null>(null)
  const [saving, setSaving] = useState(false)

  const locateAndRoute = (dest: { lat: number; lng: number }) => {
    if (!('geolocation' in navigator)) { toast('Geolocation is not available on this device', 'error'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const from = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setMyLocation(from)
        routeCtrlRef.current?.abort()
        const ctrl = new AbortController()
        routeCtrlRef.current = ctrl
        const r = await getDrivingRoute(from, dest, ctrl.signal)
        if (!ctrl.signal.aborted) setRoute(r)
        setLocating(false)
      },
      () => { setLocating(false); toast('Could not get your location. Allow location access and try again.', 'error') },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => () => routeCtrlRef.current?.abort(), [])

  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Order staff/manager access required. <Link className="font-semibold text-brand-taupe" to="/admin/login">Sign in</Link>.</div>

  const confirm = async () => {
    if (!pending) return
    setSaving(true)
    try { await api.put(`/admin/orders/${pending.id}/status`, { status: pending.status }); qc.invalidateQueries({ queryKey: ['adminOrders'] }); toast(`Order → ${pending.status}`); setPending(null) }
    catch (e: any) { toast(e?.message || 'Update failed', 'error') }
    finally { setSaving(false) }
  }

  const StatusSelect = ({ o }: { o: any }) => (
    <select aria-label={`Update status for ${o.orderNumber}`} defaultValue="" className="input min-h-[40px] min-w-[140px] text-xs" onChange={(e) => { if (e.target.value) setPending({ id: o.id, status: e.target.value, orderNumber: o.orderNumber }) }}>
      <option value="">Update…</option>
      {(NEXT[o.status] || []).map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
    </select>
  )

  return (
    <div>
      <h1 className="mb-2 font-heading text-2xl font-bold">Order Management</h1>
      <p className="mb-4 text-sm text-brand-charcoal/70">Status transitions are validated server-side and audited; cancellations release reservations.</p>
      {isLoading ? <div className="skeleton h-40 w-full rounded-md" /> : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm"><thead className="text-left text-ink-secondary"><tr><th className="p-3">Order</th><th>Customer</th><th>Status</th><th>Payment</th><th>Total</th><th>Action</th></tr></thead>
              <tbody>{(data?.data || []).map((o: any) => <tr key={o.id} className="border-t border-brand-border"><td className="p-3 font-medium">{o.orderNumber}</td><td>{o.user?.fullName || o.guestEmail || 'Guest'}</td><td><StatusBadge status={o.status} /></td><td className="text-xs">{o.paymentMethod} / {o.paymentStatus}</td><td>{fmt(Number(o.grandTotal))}</td><td>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setMapOrder(o)} disabled={!locationOf(o)} className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"><MapPin size={14} /> Location</button>
                  <StatusSelect o={o} />
                </div>
              </td></tr>)}
              {!data?.data?.length && <tr><td className="p-3 text-ink-secondary" colSpan={6}>No orders yet.</td></tr>}</tbody></table>
          </div>
          <div className="space-y-3 md:hidden">
            {(data?.data || []).map((o: any) => (
              <div key={o.id} className="card p-4">
                <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{o.orderNumber}</span><span className="font-bold">{fmt(Number(o.grandTotal))}</span></div>
                <div className="mt-1 flex items-center gap-2 text-xs text-ink-secondary"><StatusBadge status={o.status} /><span>{o.user?.fullName || o.guestEmail || 'Guest'}</span></div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" onClick={() => setMapOrder(o)} disabled={!locationOf(o)} className="btn-secondary flex-1 px-3 py-1 text-xs disabled:opacity-40"><MapPin size={14} /> Delivery pin</button>
                  <div className="flex-1"><StatusSelect o={o} /></div>
                </div>
              </div>
            ))}
            {!data?.data?.length && <p className="text-sm text-ink-secondary">No orders yet.</p>}
          </div>
        </>
      )}
      <Modal open={!!pending} onClose={() => setPending(null)} title="Confirm status change">
        <p className="text-sm text-brand-charcoal/80">Move order <span className="font-semibold">{pending?.orderNumber}</span> to <span className="font-semibold">{pending?.status?.replace(/_/g, ' ')}</span>? This is audited server-side.</p>
        <div className="mt-5 flex gap-2">
          <button className="btn-secondary flex-1" onClick={() => setPending(null)}>Cancel</button>
          <button className="btn-primary flex-1" disabled={saving} onClick={confirm}>{saving ? 'Saving…' : 'Confirm'}</button>
        </div>
      </Modal>

      <Modal open={!!mapOrder} onClose={() => { setMapOrder(null); setMyLocation(null); setRoute(null) }} title={mapOrder ? `Delivery location — ${mapOrder.orderNumber}` : 'Delivery location'}>
        {mapOrder && (() => {
          const loc = locationOf(mapOrder)
          const addr = mapOrder.shippingAddress || {}
          const fullAddr = [addr.street, addr.barangay, addr.city, addr.province, addr.region].filter(Boolean).join(', ')
          return (
            <div className="space-y-3">
              <p className="text-sm"><span className="font-semibold">{mapOrder.shippingName || mapOrder.user?.fullName || mapOrder.guestEmail || 'Customer'}</span> • {mapOrder.shippingPhone || '—'}</p>
              <p className="text-sm text-brand-charcoal/75">{fullAddr || 'No address on file'}</p>
              {loc ? (
                <>
                  <DeliveryMap value={loc} readOnly origin={myLocation} routePath={route?.path ?? null} />
                  <p className="text-xs text-ink-secondary">Pinned by customer at checkout: {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary flex-1 px-3 py-2 text-xs" disabled={locating} onClick={() => locateAndRoute(loc)}>
                      <LocateFixed size={14} /> {locating ? 'Finding you…' : 'My location & path'}
                    </button>
                    <a className="btn-secondary flex-1 px-3 py-2 text-xs" href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`} target="_blank" rel="noreferrer">Pin in Maps <ExternalLink size={14} /></a>
                  </div>
                  {route && myLocation && (
                    <div className="rounded-md bg-brand-ivory p-3 text-sm">
                      <div className="flex items-center gap-2 font-semibold"><RouteIcon size={16} className="text-brand-taupe" /> {route.roadRoute ? 'Driving route' : 'Straight-line path'}</div>
                      <p className="mt-1">
                        {route.distanceKm.toFixed(1)} km{route.roadRoute && route.durationMin > 0 ? ` • ~${route.durationMin} min by road` : ` • ${bearingLabel(myLocation, loc)} of you`} ({haversineKm(myLocation, loc).toFixed(1)} km direct)
                      </p>
                      <a className="btn-primary mt-2 w-full px-3 py-2 text-xs" href={googleDirectionsUrl(myLocation, loc)} target="_blank" rel="noreferrer">Get turn-by-turn directions <ExternalLink size={14} /></a>
                    </div>
                  )}
                </>
              ) : <p className="text-sm text-ink-secondary">This order has no pinned location (placed before map pinning was enabled).</p>}
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

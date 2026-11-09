import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, PackageSearch, Truck } from 'lucide-react'
import { api } from '@/services/api'
import { EmptyState, StatusBadge } from '@/components/ui'
import { DeliveryMap } from '@/components/DeliveryMap'

export function OrderTrackingPage() {
  const { orderNumber: param } = useParams()
  const [input, setInput] = useState(param || '')
  const [q, setQ] = useState(param || '')
  const { data, isLoading, error } = useQuery({ queryKey: ['track', q], queryFn: () => api.orders.track(q), enabled: !!q })
  const o = data?.data

  const [lookup, setLookup] = useState({ email: '', phone: '' })
  const [lookupResult, setLookupResult] = useState<any>(null)
  const [lookupError, setLookupError] = useState('')
  const [lookupBusy, setLookupBusy] = useState(false)
  const findMyOrders = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupError(''); setLookupResult(null); setLookupBusy(true)
    try {
      const res = await api.orders.lookupGuest(lookup)
      setLookupResult(res.data || [])
      if (!(res.data || []).length) setLookupError('No guest orders found for that email + phone. Check the spelling, or use your order number above.')
    } catch (ex: any) { setLookupError(ex?.data?.error?.message || ex?.message || 'Lookup failed') }
    finally { setLookupBusy(false) }
  }

  return (
    <div className="container-page mx-auto max-w-3xl pb-10 pt-4 sm:pt-10">
      <h1 className="mb-4 font-heading text-2xl font-bold sm:text-3xl">Track Order</h1>
      <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(input.trim()) }}>
        <input className="input flex-1" placeholder="Order number (e.g., KC-…)" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Order number" />
        <button className="btn-primary shrink-0" type="submit">Track</button>
      </form>

      {!q && (
        <div className="card mb-6 p-5">
          <h2 className="font-heading font-bold">Can't find your order number?</h2>
          <p className="mt-1 text-sm text-ink-secondary">Checked out as a guest? Look up your orders with the email and phone used at checkout.</p>
          <form onSubmit={findMyOrders} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className="input" type="email" inputMode="email" placeholder="Checkout email" aria-label="Checkout email" value={lookup.email} onChange={(e) => setLookup({ ...lookup, email: e.target.value })} required />
            <input className="input" type="tel" inputMode="tel" placeholder="Phone (last 4 digits enough)" aria-label="Checkout phone" value={lookup.phone} onChange={(e) => setLookup({ ...lookup, phone: e.target.value })} required />
            <button className="btn-primary" type="submit" disabled={lookupBusy}>{lookupBusy ? 'Searching…' : 'Find Orders'}</button>
          </form>
          {lookupError && <div role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{lookupError}</div>}
          {lookupResult && lookupResult.length > 0 && (
            <ul className="mt-3 space-y-2">
              {lookupResult.map((found: any) => (
                <li key={found.orderNumber}>
                  <Link to={`/track/${found.orderNumber}`} className="flex items-center justify-between gap-3 rounded-md border border-brand-border p-3 text-sm hover:border-brand-taupe/60">
                    <span><span className="block font-semibold">{found.orderNumber}</span><span className="text-xs text-ink-secondary">{new Date(found.createdAt).toLocaleDateString()} • {found.items.map((i: any) => `${i.name} × ${i.qty}`).join(', ')}</span></span>
                    <StatusBadge status={found.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-secondary">Have an account? Your orders also appear under <Link to="/account" className="font-semibold text-brand-taupe hover:underline">My Account</Link>.</p>
        </div>
      )}
      {isLoading && <div className="skeleton h-40 w-full rounded-md" />}
      {!!q && error && <EmptyState icon={<PackageSearch size={28} />} title="Order not found" description="Check the order number and try again. Numbers look like KC-XXXXXXXX." />}
      {o && (
        <div className="card space-y-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-secondary">Order</div>
              <div className="font-heading text-lg font-bold">{o.orderNumber}</div>
            </div>
            <StatusBadge status={o.status} />
          </div>
          {o.shipment?.trackingNumber && <div className="rounded-md bg-brand-ivory p-3 text-sm">Carrier: {o.shipment.carrier || '—'} • Tracking: <span className="font-medium">{o.shipment.trackingNumber}</span></div>}

          <div>
            <div className="mb-2 flex items-center gap-2 font-semibold text-sm"><Truck size={16} /> Your delivery</div>
            {o.deliveryLocation ? (
              <>
                <DeliveryMap value={o.deliveryLocation} readOnly />
                <p className="mt-2 flex items-center gap-1 text-xs text-ink-secondary"><MapPin size={12} /> Your pinned delivery location. Your rider is on the way — keep your phone nearby.</p>
              </>
            ) : (
              <div className="rounded-md border border-dashed border-brand-border p-4 text-sm text-ink-secondary">
                The delivery map appears once your order is en route (shipped). Right now your order is <StatusBadge status={o.status} /> — we're getting it ready.
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 font-semibold text-sm">Status history</div>
            <ol className="relative space-y-4 border-l border-brand-border pl-5">
              {(o.statusHistory || []).map((h: any) => (
                <li key={h.id} className="relative text-sm">
                  <span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand-taupe" aria-hidden />
                  <div className="font-medium">{h.toStatus}</div>
                  <div className="text-xs text-ink-secondary">{new Date(h.createdAt).toLocaleString()}{h.note ? ` — ${h.note}` : ''}</div>
                </li>
              ))}
              {!(o.statusHistory || []).length && <li className="text-sm text-ink-secondary">No history yet.</li>}
            </ol>
          </div>
          <div className="text-sm text-brand-charcoal/75">Items: {(o.items || []).map((i: any) => `${i.name} × ${i.qty}`).join(', ')}</div>
        </div>
      )}
    </div>
  )
}

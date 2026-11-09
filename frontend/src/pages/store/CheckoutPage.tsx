import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, LocateFixed } from 'lucide-react'
import { api } from '@/services/api'
import { fmt } from '@/utils/format'
import { Button, Field, Input } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { DeliveryMap } from '@/components/DeliveryMap'
import { AddressSearch } from '@/components/AddressSearch'
import { reverseGeocode, type AddressParts } from '@/utils/geocode'

const DRAFT_KEY = 'kc_checkout_draft'
const STEPS = ['Information', 'Delivery', 'Payment', 'Review']

type FormState = {
  fullName: string; email: string; phone: string
  region: string; province: string; city: string; barangay: string; street: string; postalCode: string; instructions: string
  lat: number | null; lng: number | null
  shippingMethod: string; paymentMethod: string; couponCode: string; referenceNumber: string; receiptImageUrl: string
}

const EMPTY: FormState = { fullName: '', email: '', phone: '', region: '', province: '', city: '', barangay: '', street: '', postalCode: '', instructions: '', lat: null, lng: null, shippingMethod: 'Standard Delivery', paymentMethod: 'COD', couponCode: '', referenceNumber: '', receiptImageUrl: '' }

function loadDraft(): FormState {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') } } catch { return EMPTY }
}

export function CheckoutPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading } = useQuery({ queryKey: ['cart'], queryFn: api.cart.get })
  const items = data?.data?.items || []
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(loadDraft)
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const [locating, setLocating] = useState(false)
  const applyAddressParts = (parts: AddressParts) => {
    setForm((f) => ({
      ...f,
      region: parts.region || f.region,
      street: parts.road || f.street,
      barangay: parts.suburb || f.barangay,
      city: parts.city || f.city,
      province: parts.state || f.province,
      postalCode: parts.postcode || f.postalCode,
    }))
  }
  // Reverse-geocode pin drops (click / drag / geolocate) to auto-fill the form.
  useEffect(() => {
    if (form.lat == null || form.lng == null) return
    const ctrl = new AbortController()
    const id = setTimeout(async () => {
      try {
        const r = await reverseGeocode(form.lat!, form.lng!, ctrl.signal)
        if (r) applyAddressParts(r.address)
      } catch { /* user can still type — reverse geocode is best-effort */ }
    }, 600)
    return () => { clearTimeout(id); ctrl.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.lat, form.lng])
  const locateMe = () => {
    if (!('geolocation' in navigator)) { toast('Geolocation is not available on this device', 'error'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })); setLocating(false); toast('Location pinned') },
      () => { setLocating(false); toast('Could not get your location. Tap the map to drop a pin instead.', 'error') },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)) } catch {} }, [form])

  const shippingFee = form.shippingMethod === 'Express' ? 180 : 120
  const subtotal = useMemo(() => items.reduce((s: number, it: any) => s + Number(it.variant?.price ?? it.variant?.product?.basePrice ?? 0) * it.quantity, 0), [items])
  const total = Math.max(0, subtotal + shippingFee)
  const needsProof = form.paymentMethod !== 'COD'

  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {}
    if (step === 0) {
      if (!form.fullName.trim()) e.fullName = 'Full name is required'
      if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
      if (!form.phone.trim()) e.phone = 'Contact number is required'
    }
    if (step === 1) {
      if (!form.city.trim()) e.city = 'City / Municipality is required'
      if (!form.street.trim()) e.street = 'Street address is required'
      if (form.lat == null || form.lng == null) e.lat = 'Drop your delivery pin on the map'
    }
    if (step === 2 && needsProof && !form.referenceNumber.trim() && !form.receiptImageUrl.trim()) {
      e.referenceNumber = 'Enter a reference number or receipt URL for manual payment'
    }
    return e
  }, [step, form, needsProof])

  const canNext = Object.keys(errors).length === 0
  const markTouched = () => {
    const t: Partial<Record<keyof FormState, boolean>> = {}
    ;(['fullName', 'email', 'phone', 'city', 'street', 'referenceNumber'] as const).forEach((k) => { t[k] = true })
    setTouched(t)
  }

  const order = useMutation({
    mutationFn: async () => {
      if (needsProof && !form.referenceNumber && !form.receiptImageUrl) throw new Error('Enter a reference number or receipt image URL for manual payment.')
      const res = await api.orders.create({
        items: items.map((it: any) => ({ variantId: it.variantId, quantity: it.quantity })),
        guestEmail: form.email,
        shipping: { fullName: form.fullName, phone: form.phone, address: { region: form.region, province: form.province, city: form.city, barangay: form.barangay, street: form.street, postalCode: form.postalCode, instructions: form.instructions, lat: form.lat, lng: form.lng } },
        shippingMethod: form.shippingMethod, shippingFee,
        paymentMethod: form.paymentMethod,
        couponCode: form.couponCode || undefined,
        idempotencyKey: crypto.randomUUID(),
      })
      if (needsProof) {
        await api.post('/payments/submit-proof', { orderId: res.data.id, orderNumber: res.data.orderNumber, referenceNumber: form.referenceNumber || undefined, receiptImageUrl: form.receiptImageUrl || undefined })
      }
      return res
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      toast('Order placed')
      nav(`/track/${res.data.orderNumber}`)
    },
    onError: (e: any) => toast(e?.data?.error?.message || e?.message || 'Could not place order', 'error'),
  })

  if (isLoading) return <div className="container-page space-y-4 py-10"><div className="skeleton h-8 w-1/3" /><div className="skeleton h-64 w-full" /></div>
  if (!items.length) return <div className="container-page py-10 text-sm">Your bag is empty. <button className="font-semibold text-brand-taupe" onClick={() => nav('/shop')}>Shop now</button></div>

  return (
    <div className="container-page pb-10 pt-4 sm:pt-10">
      <h1 className="mb-4 font-heading text-2xl font-bold sm:text-3xl">Checkout</h1>

      {/* Progress */}
      <ol aria-label="Checkout progress" className="mb-6 grid grid-cols-4 gap-1">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-col items-center gap-1 text-center">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i < step ? 'bg-success text-white' : i === step ? 'bg-brand-charcoal text-white' : 'bg-brand-gray text-ink-secondary'}`} aria-current={i === step ? 'step' : undefined}>
              {i < step ? <Check size={14} /> : i + 1}
            </span>
            <span className={`text-[11px] font-medium ${i === step ? 'text-brand-charcoal' : 'text-ink-secondary'}`}>{label}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          {step === 0 && (
            <section className="card space-y-4 p-5" aria-label="Customer information">
              <h2 className="font-heading font-bold">1. Customer Information</h2>
              <p className="text-xs text-ink-secondary">Checking out as a guest — no account needed. Just add your email below so we can send your order updates.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name" error={touched.fullName ? errors.fullName : undefined} htmlFor="co-name"><Input id="co-name" autoComplete="name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, fullName: true }))} required /></Field>
                <Field label="Email" error={touched.email ? errors.email : undefined} htmlFor="co-email"><Input id="co-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} required /></Field>
                <div className="sm:col-span-2"><Field label="Contact number" error={touched.phone ? errors.phone : undefined} htmlFor="co-phone"><Input id="co-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g., 0917 000 0000" value={form.phone} onChange={(e) => set('phone', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} required /></Field></div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="card space-y-4 p-5" aria-label="Delivery address">
              <h2 className="font-heading font-bold">2. Delivery Address</h2>
              <div>
                <label htmlFor="address-search" className="mb-1.5 block text-sm font-semibold">Find your address</label>
                <AddressSearch
                  onSelect={(r) => {
                    setForm((f) => ({ ...f, lat: r.lat, lng: r.lng }))
                    applyAddressParts(r.address)
                    toast('Pin dropped — address filled in below')
                  }}
                />
                <p className="mt-1 text-xs text-ink-secondary">Type your street, barangay, or city and pick a match — or tap the map to pin directly. Fields below fill in automatically (you can still edit them).</p>
              </div>
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Pin your delivery location</span>
                  <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={locating} onClick={locateMe}>
                    <LocateFixed size={14} /> {locating ? 'Locating…' : 'Use my location'}
                  </button>
                </div>
                <DeliveryMap value={form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null} onChange={(ll) => { setForm((f) => ({ ...f, lat: ll.lat, lng: ll.lng })) }} />
                {form.lat != null && form.lng != null ? (
                  <p className="mt-2 text-xs text-success">Pinned: {form.lat.toFixed(6)}, {form.lng.toFixed(6)} — store staff will use this to deliver to you.</p>
                ) : (
                  <p role="alert" className="mt-2 text-xs text-error">{touched.lat || touched.city ? errors.lat || 'Drop your delivery pin on the map' : 'Search an address above, or drop your delivery pin on the map so our rider can find you.'}</p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Region" htmlFor="co-region"><Input id="co-region" autoComplete="address-level1" value={form.region} onChange={(e) => set('region', e.target.value)} /></Field>
                <Field label="Province" htmlFor="co-province"><Input id="co-province" autoComplete="address-level1" value={form.province} onChange={(e) => set('province', e.target.value)} /></Field>
                <Field label="City / Municipality" error={touched.city ? errors.city : undefined} htmlFor="co-city"><Input id="co-city" autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, city: true }))} required /></Field>
                <Field label="Barangay" htmlFor="co-barangay"><Input id="co-barangay" value={form.barangay} onChange={(e) => set('barangay', e.target.value)} /></Field>
                <Field label="Postal code" htmlFor="co-postalCode"><Input id="co-postalCode" inputMode="numeric" value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} /></Field>
                <div className="sm:col-span-2"><Field label="Street address" error={touched.street ? errors.street : undefined} htmlFor="co-street"><Input id="co-street" autoComplete="address-line1" value={form.street} onChange={(e) => set('street', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, street: true }))} required /></Field></div>
                <div className="sm:col-span-2"><Field label="Delivery instructions (optional)" htmlFor="co-instructions"><Input id="co-instructions" value={form.instructions} onChange={(e) => set('instructions', e.target.value)} /></Field></div>
              </div>
              <fieldset>
                <legend className="mb-2 text-sm font-semibold">Shipping method</legend>
                <select aria-label="Shipping method" className="input" value={form.shippingMethod} onChange={(e) => set('shippingMethod', e.target.value)}>
                  <option value="Standard Delivery">Standard Delivery — ₱120 (3–5 business days)</option>
                  <option value="Express">Express — ₱180 (1–2 business days)</option>
                </select>
              </fieldset>
            </section>
          )}

          {step === 2 && (
            <section className="card space-y-4 p-5" aria-label="Payment">
              <h2 className="font-heading font-bold">3. Payment</h2>
              <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-semibold">Payment method (manual verification)</legend>
                {[['COD', 'Cash on Delivery'], ['GCASH', 'GCash — transfer + proof of receipt'], ['BANK_TRANSFER', 'Bank Transfer — transfer + proof of receipt']].map(([v, l]) => (
                  <label key={v} className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${form.paymentMethod === v ? 'border-brand-charcoal bg-brand-ivory' : 'border-brand-border'}`}>
                    <input type="radio" name="paymentMethod" checked={form.paymentMethod === v} onChange={() => set('paymentMethod', v)} className="h-5 w-5 accent-[#202020]" /> {l}
                  </label>
                ))}
              </fieldset>
              {needsProof && (
                <div className="space-y-4 border-t border-brand-border pt-4">
                  <div className="rounded-md bg-brand-ivory p-3 text-xs text-brand-charcoal/80">
                    <div className="mb-1 font-semibold">Send payment to the store account</div>
                    GCash / bank details are shown in your order confirmation and configured by admin in Store Settings. After paying, submit your reference number and receipt URL below.
                  </div>
                  <Field label="Reference number" error={touched.referenceNumber ? errors.referenceNumber : undefined} htmlFor="co-ref">
                    <Input id="co-ref" value={form.referenceNumber} onChange={(e) => set('referenceNumber', e.target.value)} onBlur={() => setTouched((t) => ({ ...t, referenceNumber: true }))} placeholder="GCash ref / bank transaction no." />
                  </Field>
                  <Field label="Receipt image URL (proof)" htmlFor="co-receipt">
                    <Input id="co-receipt" type="url" inputMode="url" value={form.receiptImageUrl} onChange={(e) => set('receiptImageUrl', e.target.value)} placeholder="https://… (hosted image URL)" />
                  </Field>
                  <p className="text-xs text-ink-secondary">Stock is reserved while payment is pending verification. Admin verifies proof before processing.</p>
                </div>
              )}
              <Field label="Coupon code" htmlFor="co-coupon"><Input id="co-coupon" className="sm:max-w-xs" value={form.couponCode} onChange={(e) => set('couponCode', e.target.value)} placeholder="Optional" /></Field>
              <p className="-mt-2 text-xs text-ink-secondary">Coupons are validated on the server at order creation.</p>
            </section>
          )}

          {step === 3 && (
            <section className="card space-y-4 p-5" aria-label="Review order">
              <h2 className="font-heading font-bold">4. Review</h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Name</dt><dd className="font-medium">{form.fullName}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Email</dt><dd className="font-medium">{form.email}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Phone</dt><dd className="font-medium">{form.phone}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Address</dt><dd className="text-right font-medium">{[form.street, form.barangay, form.city, form.province, form.region, form.postalCode].filter(Boolean).join(', ')}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Map pin</dt><dd className="font-medium">{form.lat != null ? `${form.lat.toFixed(6)}, ${form.lng!.toFixed(6)}` : '—'}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Shipping</dt><dd className="font-medium">{form.shippingMethod}</dd></div>
                <div className="flex justify-between gap-4"><dt className="text-ink-secondary">Payment</dt><dd className="font-medium">{form.paymentMethod}</dd></div>
              </dl>
              <ul className="space-y-2 border-t border-brand-border pt-3 text-sm">
                {items.map((it: any) => <li key={it.id} className="flex justify-between gap-2"><span className="text-brand-charcoal/80">{it.variant?.product?.name} ({it.variant?.size?.label}/{it.variant?.color?.name}) × {it.quantity}</span><span>{fmt(Number(it.variant?.price ?? it.variant?.product?.basePrice ?? 0) * it.quantity)}</span></li>)}
              </ul>
            </section>
          )}

          {order.isError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{(order.error as any)?.data?.error?.message || (order.error as Error).message}</div>}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="secondary" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}><ChevronLeft size={16} /> Back</Button>
            {step < 3 ? (
              <Button disabled={!canNext} onClick={() => { if (!canNext) markTouched(); else setStep((s) => s + 1) }}>Continue <ChevronRight size={16} /></Button>
            ) : (
              <Button disabled={order.isPending} onClick={() => order.mutate()}>{order.isPending ? 'Placing order…' : 'Place Order'}</Button>
            )}
          </div>
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="mb-3 font-heading font-bold">Order Review</h2>
          <ul className="mb-4 max-h-56 space-y-2 overflow-y-auto text-sm">
            {items.map((it: any) => <li key={it.id} className="flex justify-between gap-2"><span className="text-brand-charcoal/80">{it.variant?.product?.name} × {it.quantity}</span><span>{fmt(Number(it.variant?.price ?? it.variant?.product?.basePrice ?? 0) * it.quantity)}</span></li>)}
          </ul>
          <div className="space-y-1 border-t border-brand-border pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span>Shipping</span><span>{fmt(shippingFee)}</span></div>
            <div className="flex justify-between pt-1 text-base font-bold"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <p className="mt-3 text-xs text-ink-secondary">Final total, stock, and coupon are validated on the server.</p>
        </aside>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Heart, Ruler, ShoppingBag, Star } from 'lucide-react'
import { api } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { fmt, stockOf } from '@/utils/format'
import { EmptyState, QuantityStepper, RatingStars } from '@/components/ui'
import { Modal } from '@/components/overlay'
import { ProductCard } from '@/components/ProductCard'

export function ProductPage() {
  const { slug = '' } = useParams()
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['product', slug], queryFn: () => api.products.get(slug) })
  const me = useQuery({ queryKey: ['me'], queryFn: api.auth.me, retry: false, staleTime: 60_000 })
  const isLoggedIn = !!me.data?.user
  const p = data?.data
  const [color, setColor] = useState('')
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [liked, setLiked] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const colors = useMemo(() => {
    const map = new Map<string, { name: string; hex?: string | null }>()
    ;(p?.variants || []).forEach((v: any) => { if (v.color?.name && !map.has(v.color.name)) map.set(v.color.name, v.color) })
    return [...map.values()]
  }, [p])
  const sizes = useMemo<string[]>(() => Array.from(new Set<string>((p?.variants || []).filter((v: any) => !color || v.color.name === color).map((v: any) => String(v.size.label)))), [p, color])
  const variant = useMemo(() => (p?.variants || []).find((v: any) => (!color || v.color.name === color) && (!size || v.size.label === size)), [p, color, size])
  const stock = variant ? stockOf(variant) : 0
  const images = p?.images || []
  const price = Number(variant?.price ?? p?.basePrice ?? 0)
  const needsSelection = !color || !size

  useEffect(() => { if (colors[0] && !color) setColor(colors[0].name) }, [colors, color])
  useEffect(() => { setImgIdx(0); setQty(1) }, [slug])

  const add = useMutation({
    mutationFn: ({ buyNow = false }: { buyNow?: boolean } = {}) => {
      if (!variant) throw new Error('Select a color and size first.')
      return api.cart.add({ variantId: variant.id, quantity: qty })
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['cart'] })
      toast('Added to bag')
      if (vars?.buyNow) nav('/cart')
    },
    onError: (e: any) => toast(e?.message || 'Could not add to bag.', 'error'),
  })
  const wish = useMutation({
    mutationFn: () => api.wishlist.add(p.id),
    onSuccess: () => { setLiked(true); toast('Added to wishlist'); qc.invalidateQueries({ queryKey: ['wishlist'] }) },
    onError: (e: any) => toast(e?.message || 'Sign in to save to wishlist', 'error'),
  })

  if (isLoading) return (
    <div className="container-page py-10">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="skeleton aspect-square rounded-md" />
        <div className="space-y-4"><div className="skeleton h-8 w-2/3" /><div className="skeleton h-6 w-1/3" /><div className="skeleton h-24 w-full" /><div className="skeleton h-11 w-1/2" /></div>
      </div>
    </div>
  )
  if (error || !p) return <div className="container-page py-10"><EmptyState icon={<ShoppingBag size={28} />} title="Product unavailable" description={(error as Error)?.message || 'This product could not be found.'} action={<Link to="/shop" className="btn-primary">Back to shop</Link>} /></div>

  const onTrackScroll = () => {
    const el = trackRef.current; if (!el) return
    const idx = Math.round(el.scrollLeft / el.clientWidth)
    if (idx !== imgIdx) setImgIdx(idx)
  }

  return (
    <div className="container-page pb-28 pt-4 sm:py-10 md:pb-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-xs text-ink-secondary">
        <Link to="/" className="hover:underline">Home</Link> <span aria-hidden>/</span> <Link to="/shop" className="hover:underline">Shop</Link>
        {p.category && <><span aria-hidden> / </span><Link to={`/shop?category=${encodeURIComponent(p.category.slug || '')}`} className="hover:underline">{p.category.name}</Link></>}
        <span aria-hidden> / </span> <span aria-current="page" className="text-brand-charcoal">{p.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div ref={trackRef} onScroll={onTrackScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-md bg-brand-ivory" aria-label="Product images">
            {images.length ? images.map((im: any, i: number) => (
              <div key={im.id || i} className="relative w-full shrink-0 snap-center">
                <button type="button" onClick={() => setZoomed((z) => !z)} aria-label={zoomed ? 'Tap to reset zoom' : 'Tap image to zoom'} className="block w-full cursor-zoom-in overflow-hidden">
                  <img src={im.url} alt={im.alt || `${p.name} view ${i + 1}`} className={`aspect-square w-full object-cover transition-transform duration-300 ${zoomed ? 'scale-150 cursor-zoom-out' : ''}`} />
                </button>
              </div>
            )) : <div className="flex aspect-square w-full items-center justify-center text-sm text-ink-secondary">No image available</div>}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <div className="flex gap-2" role="tablist" aria-label="Image thumbnails">
                {images.map((im: any, i: number) => (
                  <button key={im.id || i} role="tab" aria-selected={i === imgIdx} onClick={() => { trackRef.current?.scrollTo({ left: i * trackRef.current.clientWidth, behavior: 'smooth' }); setImgIdx(i) }}
                    className={`h-14 w-14 overflow-hidden rounded-md border-2 ${i === imgIdx ? 'border-brand-charcoal' : 'border-transparent'}`} aria-label={`View image ${i + 1}`}>
                    <img src={im.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <span className="text-xs text-ink-secondary">{imgIdx + 1} / {images.length}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-ink-secondary">{p.category?.name || 'Footwear'}{p.brand ? ` • ${p.brand.name}` : ''}</div>
          <div className="flex items-start justify-between gap-3">
            <h1 className="font-heading text-2xl font-bold sm:text-3xl">{p.name}</h1>
            <button type="button" aria-pressed={liked} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'} disabled={wish.isPending} onClick={() => wish.mutate()}
              className="touch-target flex shrink-0 items-center justify-center rounded-full border border-brand-border p-2 hover:bg-brand-ivory">
              <Heart size={20} className={liked ? 'fill-error text-error' : ''} />
            </button>
          </div>
          <div className="mt-2"><RatingStars rating={p.rating} count={p.reviews?.length ?? p.reviewCount} /></div>
          <div className="mt-3 flex items-baseline gap-3">
            <span className="font-heading text-2xl font-bold">{fmt(price)}</span>
            {p.compareAtPrice && <span className="text-sm text-ink-secondary line-through">{fmt(Number(p.compareAtPrice))}</span>}
          </div>
          {p.description && <p className="mt-4 text-sm leading-relaxed text-brand-charcoal/80">{p.description}</p>}

          <div className="mt-6 space-y-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Color{color ? `: ${color}` : ''}</legend>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button key={c.name} onClick={() => { setColor(c.name); setSize('') }} aria-pressed={color === c.name}
                    className={`flex min-h-[44px] items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${color === c.name ? 'border-brand-charcoal bg-brand-charcoal text-white' : 'border-brand-border hover:border-brand-taupe'}`}>
                    {c.hex && <span aria-hidden className="h-4 w-4 rounded-full border border-brand-border" style={{ backgroundColor: c.hex }} />}
                    {c.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
                Size{size ? `: ${size}` : ''}
                <button type="button" onClick={() => setGuideOpen(true)} className="inline-flex items-center gap-1 text-xs font-medium text-brand-taupe hover:underline"><Ruler size={12} /> Size guide</button>
              </legend>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s: string) => {
                  const v = (p.variants || []).find((x: any) => x.size.label === s && (!color || x.color.name === color))
                  const ok = v && stockOf(v) > 0
                  return <button key={s} disabled={!ok} onClick={() => setSize(s)} aria-pressed={size === s}
                    className={`min-h-[44px] min-w-[52px] rounded-md border px-3 py-1.5 text-sm ${size === s ? 'border-brand-charcoal bg-brand-charcoal text-white' : 'border-brand-border hover:border-brand-taupe'} disabled:cursor-not-allowed disabled:opacity-40 disabled:line-through`}>{s}</button>
                })}
              </div>
            </fieldset>

            <div className="text-sm" aria-live="polite">
              {needsSelection ? <span className="text-ink-secondary">Select color and size to check availability.</span>
                : stock > 0 ? <span className="inline-flex items-center gap-1.5 text-success"><Check size={16} /> In stock ({stock} available)</span>
                : <span className="font-medium text-error">Out of stock for this variation</span>}
              {variant?.sku && <span className="ml-2 text-xs text-ink-secondary">• SKU {variant.sku}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper value={qty} max={Math.max(1, stock)} disabled={!variant || stock < 1 || !isLoggedIn} onChange={setQty} />
              <button className="btn-primary flex-1 sm:flex-none sm:px-8" disabled={!variant || stock < 1 || !isLoggedIn || add.isPending} onClick={() => add.mutate({ buyNow: false })}>
                {add.isPending ? 'Adding…' : 'Add to Bag'}
              </button>
            </div>
            {!isLoggedIn && !me.isLoading && (
              <div className="rounded-md border border-brand-border bg-brand-ivory p-3 text-sm">
                <span className="font-medium">Sign in to add shoes to your bag.</span>{' '}
                <Link to={`/login?next=${encodeURIComponent(`/products/${slug}`)}`} className="font-semibold text-brand-taupe hover:underline">Sign in</Link>
                <span className="text-ink-secondary"> to continue shopping.</span>
              </div>
            )}
            {add.isError && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{(add.error as any)?.message || 'Could not add to bag.'}</div>}

            <div className="rounded-md bg-brand-ivory p-4 text-xs text-brand-charcoal/75">
              Free shipping over ₱2,500. COD available. Manual GCash / bank transfer verified by admin — stock is reserved while payment is pending.
            </div>
          </div>
        </div>
      </div>

      {/* Specs + reviews */}
      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-heading font-bold">Specifications</h2>
          {p.specifications && Object.keys(p.specifications as object).length > 0 ? (
            <dl className="space-y-2 text-sm">{Object.entries(p.specifications as Record<string, unknown>).map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-brand-border pb-2"><dt className="text-ink-secondary">{k}</dt><dd className="text-right font-medium">{String(v)}</dd></div>)}</dl>
          ) : <p className="text-sm text-ink-secondary">No specifications listed for this product.</p>}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-heading font-bold">Reviews</h2>
          {(p.reviews || []).length === 0 && <p className="text-sm text-ink-secondary">No approved reviews yet.</p>}
          <ul className="space-y-4">
            {(p.reviews || []).map((r: any) => (
              <li key={r.id} className="border-b border-brand-border pb-3 last:border-0">
                <div className="flex items-center gap-2 text-sm"><span className="text-amber-500" aria-hidden>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span><span className="font-semibold">{r.user?.fullName || 'Customer'}</span>{r.isVerifiedPurchase && <span className="text-xs text-success">(verified purchase)</span>}</div>
                {r.comment && <p className="mt-1 text-sm text-brand-charcoal/80">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <RelatedProducts category={p.category?.slug} exclude={p.slug} />

      {/* Sticky mobile purchase bar */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="font-heading text-base font-bold">{fmt(price)}</div>
            <div className="truncate text-[11px] text-ink-secondary">{!isLoggedIn && !me.isLoading ? 'Sign in to add to bag' : needsSelection ? 'Select color & size' : stock > 0 ? `In stock (${stock})` : 'Out of stock'}</div>
          </div>
          <button className="btn-secondary flex-1" disabled={!variant || stock < 1 || !isLoggedIn || add.isPending} onClick={() => add.mutate({ buyNow: false })}>Add to Bag</button>
          <button className="btn-primary flex-1" disabled={!variant || stock < 1 || !isLoggedIn || add.isPending} onClick={() => add.mutate({ buyNow: true })}>{add.isPending ? 'Adding…' : 'Buy Now'}</button>
        </div>
      </div>

      <Modal open={guideOpen} onClose={() => setGuideOpen(false)} title="Size guide">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-ink-secondary"><th className="py-2 pr-4">PH Size</th><th className="py-2 pr-4">US</th><th className="py-2 pr-4">EU</th><th className="py-2">Foot (cm)</th></tr></thead>
            <tbody>{[['7', '7', '40', '25.0'], ['8', '8', '41', '26.0'], ['9', '9', '42', '27.0'], ['10', '10', '43', '28.0'], ['11', '11', '44', '29.0']].map((r) => <tr key={r[0]} className="border-t border-brand-border">{r.map((c) => <td key={c} className="py-2 pr-4">{c}</td>)}</tr>)}</tbody>
          </table>
          <p className="mt-3 text-xs text-ink-secondary"><Star size={12} className="mr-1 inline" /> Tip: if you're between sizes, size up for comfort. Measure your foot in the evening for the best fit.</p>
        </div>
      </Modal>
    </div>
  )
}

function RelatedProducts({ category, exclude }: { category?: string; exclude?: string }) {
  const { data } = useQuery({ queryKey: ['related', category], queryFn: () => api.products.related(category, exclude), enabled: !!category })
  const items = data?.data || []
  if (!items.length) return null
  return (
    <section className="mt-10">
      <h2 className="mb-4 font-heading text-xl font-bold">You may also like</h2>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
        {items.slice(0, 4).map((p: any) => <div key={p.id} className="w-[42vw] max-w-[220px] shrink-0 snap-start sm:w-[38vw] md:w-auto md:max-w-none"><ProductCard product={p} /></div>)}
      </div>
    </section>
  )
}

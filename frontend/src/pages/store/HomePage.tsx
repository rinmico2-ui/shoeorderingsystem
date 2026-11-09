import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ShieldCheck, Truck, Headset, BadgeCheck, Sparkles, Star } from 'lucide-react'
import { api } from '@/services/api'
import { ProductCard } from '@/components/ProductCard'
import { ProductCardSkeleton, EmptyState } from '@/components/ui'
import { Reveal } from '@/components/overlay'
import { PackageSearch } from 'lucide-react'

function SectionHeader({ eyebrow, title, to, cta = 'View all' }: { eyebrow: string; title: string; to: string; cta?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-taupe">{eyebrow}</p>
        <h2 className="mt-1 font-heading text-2xl font-bold sm:text-3xl">{title}</h2>
      </div>
      <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-taupe hover:underline">{cta} <ArrowRight size={16} /></Link>
    </div>
  )
}

function ProductRow({ title, eyebrow, to, query, limit = 8 }: { title: string; eyebrow: string; to: string; query: any; limit?: number }) {
  const { data, isLoading, error } = useQuery({ queryKey: ['products', query], queryFn: () => api.products.list({ ...query, limit }) })
  const items = data?.data || []
  return (
    <Reveal>
      <SectionHeader eyebrow={eyebrow} title={title} to={to} />
      {isLoading && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Could not load products. {(error as Error).message}</div>}
      {!isLoading && !error && items.length === 0 && <p className="text-sm text-ink-secondary">No products yet. Seed the database to see the catalog.</p>}
      {items.length > 0 && (
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0">
          {items.map((p: any) => <div key={p.id} className="w-[44vw] max-w-[220px] shrink-0 snap-start sm:w-[38vw] md:w-auto md:max-w-none"><ProductCard product={p} /></div>)}
        </div>
      )}
    </Reveal>
  )
}

export function HomePage() {
  const hero = useQuery({ queryKey: ['products', { sort: 'recommended', hero: true }], queryFn: () => api.products.list({ sort: 'recommended', limit: 6 }) })
  const newest = useQuery({ queryKey: ['products', { sort: 'newest', heroFeat: true }], queryFn: () => api.products.list({ sort: 'newest', limit: 6 }) })
  const cats = useQuery({ queryKey: ['categories'], queryFn: api.categories.list })

  const heroProduct = hero.data?.data?.find((p: any) => p.images?.[0]?.url) || hero.data?.data?.[0]
  const heroImg = heroProduct?.images?.[0]?.url
  const promoProduct = newest.data?.data?.find((p: any) => p.images?.[0]?.url && p.id !== heroProduct?.id) || newest.data?.data?.[0]
  const totalCount = hero.data?.meta?.total

  // Category tile images from real product photos (category.imageUrl first, else first product in that category)
  const catImages = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of (hero.data?.data || [])) {
      const slug = p.category?.slug || p.category?.name?.toLowerCase()
      if (slug && !map.has(slug) && p.images?.[0]?.url) map.set(slug, p.images[0].url)
    }
    return map
  }, [hero.data])

  return (
    <div>
      {/* Editorial hero */}
      <section className="relative overflow-hidden bg-brand-charcoal text-white">
        <div className="container-page relative grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-sand">
              <Sparkles size={12} /> New drop — fresh pairs weekly
            </span>
            <h1 className="mt-4 text-balance font-heading text-4xl font-extrabold leading-[1.05] sm:text-6xl">
              Walk in <span className="text-brand-taupe">style.</span> Walk with confidence.
            </h1>
            <p className="mt-4 max-w-lg text-sm text-brand-ivory/80 sm:text-base">
              Premium sneakers, casual pairs, and formal shoes curated for comfort, quality, and everyday style — delivered anywhere in the Philippines.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary bg-white text-brand-charcoal hover:bg-brand-ivory">Shop Now</Link>
              <Link to="/shop?sort=newest" className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">Explore Collection</Link>
            </div>
            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-white/15 pt-5 text-sm">
              <div><dt className="sr-only">Styles</dt><dd className="font-heading text-xl font-bold">{totalCount ?? '—'}</dd><dd className="text-xs text-brand-ivory/70">Styles in store</dd></div>
              <div><dt className="sr-only">Categories</dt><dd className="font-heading text-xl font-bold">{cats.data?.data?.length ?? '—'}</dd><dd className="text-xs text-brand-ivory/70">Categories</dd></div>
              <div><dt className="sr-only">Delivery</dt><dd className="font-heading text-xl font-bold">PH-wide</dd><dd className="text-xs text-brand-ivory/70">Tracked delivery</dd></div>
            </dl>
          </div>

          <Link to={heroProduct ? `/products/${heroProduct.slug}` : '/shop'} className="group relative block overflow-hidden rounded-2xl bg-brand-sand/20 shadow-card" aria-label={heroProduct ? `Shop ${heroProduct.name}` : 'Shop the collection'}>
            {heroImg ? (
              <img src={heroImg} alt={heroProduct?.name || 'Featured footwear'} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.05] lg:aspect-[5/5]" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-brand-sand/30 text-sm text-brand-ivory/60 lg:aspect-[5/5]">{hero.isLoading ? 'Loading featured pair…' : 'Featured pair appears here once seeded'}</div>
            )}
            <span className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/60 via-transparent to-transparent" aria-hidden />
            {heroProduct && (
              <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 rounded-xl bg-white/95 px-4 py-3 text-brand-charcoal shadow-card">
                <span className="min-w-0">
                  <span className="line-clamp-1 text-sm font-semibold">{heroProduct.name}</span>
                  <span className="text-xs text-ink-secondary">{heroProduct.category?.name || 'Footwear'}{heroProduct.rating ? ` • ★ ${Number(heroProduct.rating).toFixed(1)}` : ''}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-heading text-base font-bold">₱{Number(heroProduct.basePrice).toLocaleString('en-PH')}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-taupe">Shop now →</span>
                </span>
              </span>
            )}
          </Link>
        </div>
      </section>

      {/* Trust marquee */}
      <div className="border-b border-brand-border bg-white">
        <div className="container-page flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-3 text-xs font-medium text-brand-charcoal/75">
          <span className="inline-flex items-center gap-1.5"><BadgeCheck size={14} className="text-brand-taupe" /> Quality checked pairs</span>
          <span className="inline-flex items-center gap-1.5"><Truck size={14} className="text-brand-taupe" /> Tracked PH-wide delivery</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-taupe" /> COD + manual GCash / bank</span>
          <span className="inline-flex items-center gap-1.5"><Headset size={14} className="text-brand-taupe" /> Support before & after</span>
        </div>
      </div>

      {/* Categories with product photography */}
      <section className="container-page py-10 sm:py-14">
        <Reveal>
          <SectionHeader eyebrow="Curated collections" title="Shop by category" to="/shop" cta="All shoes" />
          {cats.isLoading && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[4/3] rounded-xl" />)}</div>}
          {cats.data && (cats.data.data || []).length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {(cats.data.data || []).slice(0, 8).map((c: any) => {
                const img = c.imageUrl || catImages.get(c.slug)
                return (
                  <Link key={c.id} to={`/shop?category=${encodeURIComponent(c.slug)}`} className="group relative block overflow-hidden rounded-xl bg-brand-ivory">
                    {img ? (
                      <img src={img} alt={c.name} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-[1.06]" />
                    ) : (
                      <span className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-br from-brand-sand/40 to-brand-ivory text-brand-charcoal/40"><Sparkles size={22} /></span>
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/75 via-brand-charcoal/10 to-transparent" aria-hidden />
                    <span className="absolute inset-x-3 bottom-3 flex items-center justify-between text-white">
                      <span className="text-sm font-semibold">{c.name}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition group-hover:bg-white group-hover:text-brand-charcoal"><ArrowRight size={14} /></span>
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
          {cats.data && !(cats.data.data || []).length && <EmptyState icon={<PackageSearch size={28} />} title="Categories coming soon" description="Browse the full catalog while categories are being set up." action={<Link to="/shop" className="btn-primary">Browse all shoes</Link>} />}
        </Reveal>
      </section>

      <section className="container-page pb-10 sm:pb-14">
        <ProductRow eyebrow="Fresh in" title="New Arrivals" to="/shop?sort=newest" query={{ sort: 'newest' }} />
      </section>

      {/* Editor's pick — large feature panel from real featured products */}
      {heroProduct && (
        <section className="container-page pb-10 sm:pb-14">
          <Reveal>
            <div className="grid overflow-hidden rounded-2xl bg-gradient-to-br from-brand-ivory to-brand-sand/40 lg:grid-cols-2">
              <Link to={`/products/${heroProduct.slug}`} className="group block overflow-hidden" aria-label={`View ${heroProduct.name}`}>
                {heroImg ? <img src={heroImg} alt={heroProduct.name} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition duration-700 group-hover:scale-[1.04] lg:aspect-auto" /> : <span className="flex aspect-[4/3] items-center justify-center text-sm text-brand-charcoal/50">No image</span>}
              </Link>
              <div className="flex flex-col justify-center p-6 sm:p-10">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-charcoal px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white"><Star size={12} className="fill-amber-400 text-amber-400" /> Editor's pick</span>
                <h2 className="mt-3 font-heading text-2xl font-bold sm:text-3xl">{heroProduct.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm text-brand-charcoal/75">{heroProduct.description || 'Selected for comfort, quality, and everyday style.'}</p>
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-heading text-2xl font-bold">₱{Number(heroProduct.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                  {heroProduct.compareAtPrice ? <span className="text-sm text-ink-secondary line-through">₱{Number(heroProduct.compareAtPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span> : null}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link to={`/products/${heroProduct.slug}`} className="btn-primary">Shop this pair</Link>
                  <Link to="/shop" className="btn-secondary">See more styles</Link>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}

      <section className="bg-brand-ivory/70">
        <div className="container-page py-10 sm:py-14">
          <ProductRow eyebrow="Customer favourites" title="Best Sellers" to="/shop?sort=best" query={{ sort: 'recommended' }} />
        </div>
      </section>

      {/* Campaign banner with real product imagery */}
      <section className="container-page py-10 sm:py-14">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl bg-brand-charcoal text-white">
            {promoProduct?.images?.[0]?.url && (
              <img src={promoProduct.images[0].url} alt="" aria-hidden loading="lazy" className="absolute inset-y-0 right-0 hidden h-full w-1/2 object-cover opacity-40 sm:block" />
            )}
            <span className="absolute inset-0 bg-gradient-to-r from-brand-charcoal via-brand-charcoal/85 to-brand-charcoal/20" aria-hidden />
            <div className="relative flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center sm:p-10">
              <div className="max-w-lg">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-taupe">Member pricing & promos</p>
                <h2 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">Free shipping on orders over ₱2,500</h2>
                <p className="mt-2 text-sm text-brand-ivory/80">Discounts are validated on the server at checkout — the price you see is the price you pay. No surprises.</p>
                {promoProduct && <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">Trending: {promoProduct.name}</p>}
              </div>
              <Link to="/shop" className="btn-primary shrink-0 bg-white text-brand-charcoal hover:bg-brand-ivory">Shop the drop</Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Brand promise */}
      <section className="border-t border-brand-border bg-white">
        <div className="container-page grid gap-6 py-10 sm:py-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-taupe">The Khyleene promise</p>
            <h2 className="mt-1 font-heading text-2xl font-bold">Quality you can step into.</h2>
            <p className="mt-2 max-w-sm text-sm text-brand-charcoal/70">Every pair is checked before dispatch and shipped with tracking. If size's off, our support team makes it right.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[
              { icon: BadgeCheck, t: 'Quality products', d: 'Carefully selected footwear, checked before dispatch.' },
              { icon: ShieldCheck, t: 'Secure payments', d: 'COD and trusted manual GCash / bank transfer.' },
              { icon: Truck, t: 'Reliable delivery', d: 'Tracked shipping across the Philippines.' },
              { icon: Headset, t: 'Customer support', d: 'Help before and after purchase.' },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex gap-3 rounded-xl border border-brand-border bg-brand-ivory/50 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-taupe shadow-subtle"><Icon size={20} /></span>
                <div><div className="font-heading font-semibold">{t}</div><div className="text-sm text-brand-charcoal/70">{d}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

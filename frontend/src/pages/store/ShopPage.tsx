import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { Filter, ArrowUpDown, Search, X } from 'lucide-react'
import { api } from '@/services/api'
import { ProductCard } from '@/components/ProductCard'
import { ProductCardSkeleton, EmptyState } from '@/components/ui'
import { BottomSheet } from '@/components/overlay'
import { useDebouncedValue } from '@/components/SearchOverlay'
import { PackageSearch } from 'lucide-react'

const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'best', label: 'Best Sellers' },
]

export function ShopPage() {
  const [sp, setSp] = useSearchParams()
  const sort = sp.get('sort') || 'recommended'
  const searchParam = sp.get('search') || ''
  const category = sp.get('category') || ''
  const availableOnly = sp.get('available') === '1'
  const minPrice = sp.get('minPrice') || ''
  const maxPrice = sp.get('maxPrice') || ''
  const page = Math.max(1, Number(sp.get('page')) || 1)

  const [searchInput, setSearchInput] = useState(searchParam)
  const debouncedSearch = useDebouncedValue(searchInput, 400)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [draft, setDraft] = useState({ category, availableOnly, minPrice, maxPrice })

  useEffect(() => { setSearchInput(searchParam) }, [searchParam])
  useEffect(() => { setDraft({ category, availableOnly, minPrice, maxPrice }) }, [category, availableOnly, minPrice, maxPrice])

  // Debounced search writes to URL (preserves back-navigation)
  useEffect(() => {
    if (debouncedSearch !== searchParam) {
      const next = new URLSearchParams(sp)
      if (debouncedSearch) next.set('search', debouncedSearch); else next.delete('search')
      next.set('page', '1')
      setSp(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const params = useMemo(() => ({ sort, search: searchParam, category, available: availableOnly ? '1' : undefined, minPrice, maxPrice, page, limit: 12 }), [sort, searchParam, category, availableOnly, minPrice, maxPrice, page])
  const { data, isLoading, error } = useQuery({ queryKey: ['products', params], queryFn: () => api.products.list(params) })
  const cats = useQuery({ queryKey: ['categories'], queryFn: api.categories.list })

  const items = data?.data || []
  const total = data?.meta?.total
  const pages = data?.meta?.pages || 1
  const activeFilterCount = [category ? 1 : 0, availableOnly ? 1 : 0, minPrice ? 1 : 0, maxPrice ? 1 : 0].reduce((a, b) => a + b, 0)

  const applyFilters = () => {
    const next = new URLSearchParams(sp)
    if (draft.category) next.set('category', draft.category); else next.delete('category')
    if (draft.availableOnly) next.set('available', '1'); else next.delete('available')
    if (draft.minPrice) next.set('minPrice', draft.minPrice); else next.delete('minPrice')
    if (draft.maxPrice) next.set('maxPrice', draft.maxPrice); else next.delete('maxPrice')
    next.set('page', '1')
    setSp(next); setFilterOpen(false)
  }
  const resetFilters = () => { setDraft({ category: '', availableOnly: false, minPrice: '', maxPrice: '' }) }

  const filterForm = (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Category</legend>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setDraft((d) => ({ ...d, category: '' }))} className={`rounded-full border px-3 py-2 text-sm ${!draft.category ? 'border-brand-charcoal bg-brand-charcoal text-white' : 'border-brand-border'}`}>All</button>
          {(cats.data?.data || []).map((c: any) => (
            <button key={c.id} type="button" onClick={() => setDraft((d) => ({ ...d, category: c.slug }))} className={`rounded-full border px-3 py-2 text-sm ${draft.category === c.slug ? 'border-brand-charcoal bg-brand-charcoal text-white' : 'border-brand-border'}`}>{c.name}</button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Price (PHP)</legend>
        <div className="grid grid-cols-2 gap-2">
          <input inputMode="numeric" type="number" min={0} placeholder="Min" aria-label="Minimum price" value={draft.minPrice} onChange={(e) => setDraft((d) => ({ ...d, minPrice: e.target.value }))} className="input" />
          <input inputMode="numeric" type="number" min={0} placeholder="Max" aria-label="Maximum price" value={draft.maxPrice} onChange={(e) => setDraft((d) => ({ ...d, maxPrice: e.target.value }))} className="input" />
        </div>
      </fieldset>
      <label className="flex min-h-[44px] items-center gap-3 text-sm">
        <input type="checkbox" checked={draft.availableOnly} onChange={(e) => setDraft((d) => ({ ...d, availableOnly: e.target.checked }))} className="h-5 w-5 accent-[#202020]" />
        In stock only
      </label>
    </div>
  )

  return (
    <div className="container-page py-6 sm:py-10">
      <div className="mb-4 sm:mb-6">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Shop</h1>
        <p className="text-sm text-brand-charcoal/70">Find your next pair.</p>
      </div>

      {/* Mobile sticky toolbar */}
      <div className="sticky top-14 z-30 -mx-4 mb-4 border-b border-brand-border bg-white/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search shoes" aria-label="Search products" inputMode="search" className="input pl-9 pr-9" />
            {searchInput && <button aria-label="Clear search" onClick={() => setSearchInput('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-brand-ivory"><X size={16} /></button>}
          </div>
          <button onClick={() => setFilterOpen(true)} className="btn-secondary min-h-[44px] px-3 md:hidden" aria-label={`Open filters${activeFilterCount ? `, ${activeFilterCount} active` : ''}`}>
            <Filter size={16} /> Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
          </button>
          <button onClick={() => setSortOpen(true)} className="btn-secondary min-h-[44px] px-3 md:hidden"><ArrowUpDown size={16} /> Sort</button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-ink-secondary md:hidden">
          <span>{total !== undefined ? `${total} product${total === 1 ? '' : 's'}` : 'Products'}</span>
          <span>{SORTS.find((s) => s.value === sort)?.label}</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block" aria-label="Filters">
          <div className="sticky top-24 space-y-6">
            {filterForm}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={applyFilters}>Apply</button>
              <button className="btn-secondary flex-1" onClick={resetFilters}>Reset</button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold" htmlFor="sort-desktop">Sort by</label>
              <select id="sort-desktop" value={sort} onChange={(e) => { const n = new URLSearchParams(sp); n.set('sort', e.target.value); n.set('page', '1'); setSp(n) }} className="input">
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
        </aside>

        <div>
          <div className="mb-4 hidden items-center justify-between text-sm text-ink-secondary md:flex">
            <span>{total !== undefined ? `${total} product${total === 1 ? '' : 's'}` : ''}</span>
            {(category || searchParam || availableOnly || minPrice || maxPrice) && (
              <button onClick={() => { const n = new URLSearchParams(sp); ['category', 'search', 'available', 'minPrice', 'maxPrice'].forEach((k) => n.delete(k)); setSp(n) }} className="font-semibold text-brand-taupe hover:underline">Clear all</button>
            )}
          </div>

          {isLoading && <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>}
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Could not load products. {(error as Error).message}</div>}
          {!isLoading && !error && items.length === 0 && (
            <EmptyState icon={<PackageSearch size={28} />} title="No products found" description="Try a different search or clear your filters." action={<button className="btn-primary" onClick={() => { const n = new URLSearchParams(); setSp(n) }}>Clear filters</button>} />
          )}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {items.map((p: any) => <ProductCard key={p.id} product={p} />)}
          </div>

          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3 text-sm">
              <button disabled={page <= 1} className="btn-secondary px-4 py-2 disabled:opacity-40" onClick={() => { const n = new URLSearchParams(sp); n.set('page', String(page - 1)); setSp(n) }}>Prev</button>
              <span>Page {page} of {pages}</span>
              <button disabled={page >= pages} className="btn-secondary px-4 py-2 disabled:opacity-40" onClick={() => { const n = new URLSearchParams(sp); n.set('page', String(page + 1)); setSp(n) }}>Next</button>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile sheets */}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title="Filters"
        footer={<div className="flex gap-2"><button className="btn-secondary flex-1" onClick={resetFilters}>Reset</button><button className="btn-primary flex-1" onClick={applyFilters}>Apply Filters</button></div>}>
        {filterForm}
      </BottomSheet>
      <BottomSheet open={sortOpen} onClose={() => setSortOpen(false)} title="Sort">
        <div className="space-y-1">
          {SORTS.map((s) => (
            <button key={s.value} onClick={() => { const n = new URLSearchParams(sp); n.set('sort', s.value); n.set('page', '1'); setSp(n); setSortOpen(false) }}
              className={`flex min-h-[48px] w-full items-center justify-between rounded-md px-3 text-left text-sm ${sort === s.value ? 'bg-brand-ivory font-semibold' : 'hover:bg-brand-ivory'}`} aria-pressed={sort === s.value}>
              {s.label}{sort === s.value && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

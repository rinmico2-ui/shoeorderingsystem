import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Search, X, Clock3, Tag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { ProductCard } from './ProductCard'

const RECENT_KEY = 'kc_recent_searches'

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const id = setTimeout(() => setV(value), delay); return () => clearTimeout(id) }, [value, delay])
  return v
}

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const debounced = useDebouncedValue(q, 350)
  const [recent, setRecent] = useState<string[]>([])
  const nav = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) { try { setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')) } catch { setRecent([]) }; setTimeout(() => inputRef.current?.focus(), 60) } }, [open])
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  const { data, isLoading, error } = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => api.products.list({ search: debounced, limit: 8 }),
    enabled: open && debounced.trim().length >= 2,
  })
  const cats = useQuery({ queryKey: ['categories'], queryFn: api.categories.list, enabled: open })

  const submit = (term: string) => {
    const t = term.trim()
    if (!t) return
    const next = [t, ...recent.filter((r) => r !== t)].slice(0, 6)
    setRecent(next); try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
    onClose(); nav(`/shop?search=${encodeURIComponent(t)}`)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Search">
          <motion.button aria-label="Close search" className="absolute inset-0 bg-brand-charcoal/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.22 }}
            className="safe-top absolute inset-x-0 top-0 max-h-[92dvh] overflow-y-auto rounded-b-2xl bg-white shadow-sheet">
            <div className="container-page py-4">
              <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); submit(q) }}>
                <div className="relative flex-1">
                  <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
                  <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search shoes, brands, categories…" aria-label="Search products"
                    className="input pl-10 pr-10" inputMode="search" />
                  {q && <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-brand-ivory"><X size={16} /></button>}
                </div>
                <button type="submit" className="btn-primary shrink-0">Search</button>
                <button type="button" onClick={onClose} aria-label="Close search" className="touch-target flex items-center justify-center rounded-md hover:bg-brand-ivory"><X size={20} /></button>
              </form>

              {!q.trim() && (
                <div className="mt-5 space-y-5">
                  {recent.length > 0 && (
                    <section>
                      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary"><Clock3 size={14} /> Recent</h3>
                      <div className="flex flex-wrap gap-2">{recent.map((r) => <button key={r} onClick={() => submit(r)} className="rounded-full border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-ivory">{r}</button>)}</div>
                    </section>
                  )}
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-secondary"><Tag size={14} /> Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {(cats.data?.data || []).map((c: any) => (
                        <button key={c.id} onClick={() => { onClose(); nav(`/shop?category=${encodeURIComponent(c.slug)}`) }} className="rounded-full border border-brand-border px-3 py-1.5 text-sm hover:bg-brand-ivory">{c.name}</button>
                      ))}
                      {cats.data && !(cats.data.data || []).length && <span className="text-sm text-ink-secondary">No categories yet.</span>}
                    </div>
                  </section>
                </div>
              )}

              {debounced.trim().length >= 2 && (
                <div className="mt-5">
                  {isLoading && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-square" />)}</div>}
                  {error && <div className="text-sm text-error">Search failed. Try again.</div>}
                  {data && (data.data || []).length === 0 && <div className="py-8 text-center text-sm text-ink-secondary">No results for “{debounced}”. <Link to="/shop" onClick={onClose} className="font-semibold text-brand-taupe">Browse all shoes</Link></div>}
                  {data && (data.data || []).length > 0 && (
                    <>
                      <div className="mb-3 flex items-center justify-between"><span className="text-sm text-ink-secondary">{data.data.length} result{data.data.length === 1 ? '' : 's'}</span><button onClick={() => submit(debounced)} className="text-sm font-semibold text-brand-taupe">View all</button></div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{data.data.map((p: any) => <div key={p.id} onClick={onClose}><ProductCard product={p} /></div>)}</div>
                    </>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

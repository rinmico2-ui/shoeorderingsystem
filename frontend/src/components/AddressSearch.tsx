import { useEffect, useRef, useState } from 'react'
import { Loader2, MapPin, Search, X } from 'lucide-react'
import { searchAddress, type GeoResult } from '@/utils/geocode'

/**
 * Address autocomplete (Nominatim). Picking a result drops the map pin.
 */
export function AddressSearch({ onSelect }: { onSelect: (r: GeoResult) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (q.trim().length < 4) { setResults([]); setLoading(false); setOpen(false); return }
    setLoading(true)
    const id = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      try {
        const res = await searchAddress(q, ctrl.signal)
        setResults(res)
        setOpen(res.length > 0)
        setHighlight(0)
      } catch { /* aborted or network — keep previous results hidden */ }
      finally { setLoading(false) }
    }, 500)
    return () => clearTimeout(id)
  }, [q])

  useEffect(() => () => abortRef.current?.abort(), [])

  const choose = (r: GeoResult) => {
    onSelect(r)
    setQ(r.displayName)
    setResults([])
    setOpen(false)
  }

  return (
    <div className="relative">
      <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" aria-hidden />
      <input
        ref={inputRef}
        id="address-search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => { if (results.length) setOpen(true) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, results.length - 1 || 0)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') { const r = results[highlight]; if (r) { e.preventDefault(); choose(r) } }
          else if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="Search your address (street, barangay, city)…"
        aria-label="Search delivery address"
        aria-expanded={open}
        aria-controls="address-suggestions"
        role="combobox"
        aria-activedescendant={open && results[highlight] ? `addr-${highlight}` : undefined}
        className="input pr-16 pl-10"
        inputMode="search"
        autoComplete="off"
      />
      <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
        {loading && <Loader2 size={16} className="animate-spin text-ink-secondary" aria-label="Searching" />}
        {q && <button type="button" aria-label="Clear address search" onClick={() => { setQ(''); setResults([]); inputRef.current?.focus() }} className="rounded-full p-1 hover:bg-brand-ivory"><X size={16} /></button>}
      </span>
      {open && results.length > 0 && (
        <ul id="address-suggestions" role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border border-brand-border bg-white shadow-card">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lng}-${i}`} role="option" id={`addr-${i}`} aria-selected={i === highlight}
              onMouseDown={(e) => { e.preventDefault(); choose(r) }}
              onMouseEnter={() => setHighlight(i)}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2.5 text-sm ${i === highlight ? 'bg-brand-ivory' : ''}`}>
              <MapPin size={16} className="mt-0.5 shrink-0 text-brand-taupe" aria-hidden />
              <span className="line-clamp-2">{r.displayName}</span>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 4 && !loading && open === false && results.length === 0 && (
        <p className="mt-1 text-xs text-ink-secondary">No matches found — try a nearby landmark, or tap the map to drop the pin.</p>
      )}
    </div>
  )
}

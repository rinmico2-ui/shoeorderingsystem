import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { api } from '@/services/api'
import { EmptyState } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { clearGuestWishlist, getGuestWishlist, saveGuestWishlist, type GuestWishItem } from '@/utils/guestWishlist'

export function WishlistPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const me = useQuery({ queryKey: ['me'], queryFn: api.auth.me, retry: false })
  const isGuest = !me.data?.user
  const { data, isLoading, error } = useQuery({ queryKey: ['wishlist'], queryFn: api.wishlist.get, retry: false, enabled: !isGuest })
  const [guestItems, setGuestItems] = useState<GuestWishItem[]>(() => getGuestWishlist())

  // After sign-in, sync device-local wishlist to the account, then clear it locally.
  useEffect(() => {
    if (!me.data?.user) return
    const local = getGuestWishlist()
    if (!local.length) return
    ;(async () => {
      let synced = 0
      for (const item of local) {
        try { await api.wishlist.add(item.productId); synced++ } catch { /* already saved / product gone */ }
      }
      clearGuestWishlist()
      setGuestItems([])
      qc.invalidateQueries({ queryKey: ['wishlist'] })
      if (synced) toast(`${synced} item${synced === 1 ? '' : 's'} synced to your wishlist`)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.data?.user?.id])

  const removeServer = async (id: string) => {
    try { await api.wishlist.remove(id); qc.invalidateQueries({ queryKey: ['wishlist'] }); toast('Removed from wishlist') }
    catch (e: any) { toast(e?.message || 'Could not remove', 'error') }
  }
  const removeGuest = (productId: string) => {
    const next = guestItems.filter((i) => i.productId !== productId)
    saveGuestWishlist(next)
    setGuestItems(next)
    toast('Removed from wishlist')
  }

  if (me.isLoading || (!isGuest && isLoading)) return <div className="container-page space-y-3 py-10">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-md" />)}</div>

  if (isGuest) {
    return (
      <div className="container-page pb-10 pt-4 sm:pt-10">
        <h1 className="mb-2 font-heading text-2xl font-bold sm:text-3xl">Wishlist {guestItems.length ? <span className="text-base font-medium text-ink-secondary">({guestItems.length})</span> : null}</h1>
        <p className="mb-4 text-sm text-ink-secondary">You're browsing as a guest — saved pairs live on this device. <Link to="/login" className="font-semibold text-brand-taupe hover:underline">Sign in</Link> to sync them to your account.</p>
        {guestItems.length === 0 ? (
          <EmptyState icon={<Heart size={28} />} title="Your wishlist is empty" description="Tap the heart on any product to save it for later — no account needed." action={<Link to="/shop" className="btn-primary">Start Shopping</Link>} />
        ) : (
          <ul className="space-y-3">
            {guestItems.map((it) => (
              <li key={it.productId} className="card flex gap-4 p-3 sm:p-4">
                <Link to={`/products/${it.slug}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-brand-ivory">
                  {it.image ? <img src={it.image} alt={it.name} className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={`/products/${it.slug}`} className="line-clamp-2 text-sm font-semibold hover:underline">{it.name}</Link>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-heading font-bold">₱{Number(it.basePrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    <div className="flex items-center gap-2">
                      <Link to={`/products/${it.slug}`} className="btn-secondary px-3 py-1.5 text-xs">View</Link>
                      <button aria-label={`Remove ${it.name} from wishlist`} onClick={() => removeGuest(it.productId)} className="touch-target rounded-md p-2 text-ink-secondary hover:bg-red-50 hover:text-error"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const items = data?.data?.items || []
  return (
    <div className="container-page pb-10 pt-4 sm:pt-10">
      <h1 className="mb-4 font-heading text-2xl font-bold sm:text-3xl">Wishlist {items.length ? <span className="text-base font-medium text-ink-secondary">({items.length})</span> : null}</h1>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Could not load your wishlist.</div>}
      {items.length === 0 ? (
        <EmptyState icon={<Heart size={28} />} title="Your wishlist is empty" description="Tap the heart on any product to save it for later." action={<Link to="/shop" className="btn-primary">Start Shopping</Link>} />
      ) : (
        <ul className="space-y-3">
          {items.map((it: any) => {
            const p = it.product || {}
            const inStock = (p.variants || []).some((v: any) => ((v.inventory?.quantityOnHand ?? 0) - (v.inventory?.quantityReserved ?? 0)) > 0)
            return (
              <li key={it.id} className="card flex gap-4 p-3 sm:p-4">
                <Link to={p.slug ? `/products/${p.slug}` : '/shop'} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-brand-ivory">
                  {p.images?.[0]?.url ? <img src={p.images[0].url} alt={p.name} className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to={p.slug ? `/products/${p.slug}` : '/shop'} className="line-clamp-2 text-sm font-semibold hover:underline">{p.name}</Link>
                  <div className="mt-0.5 text-xs text-ink-secondary">{p.category?.name || 'Footwear'}</div>
                  {!inStock && <div className="mt-1 text-xs font-medium text-error">Currently out of stock</div>}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-heading font-bold">₱{Number(p.basePrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    <div className="flex items-center gap-2">
                      <Link to={p.slug ? `/products/${p.slug}` : '/shop'} className="btn-secondary px-3 py-1.5 text-xs">View</Link>
                      <button aria-label={`Remove ${p.name} from wishlist`} onClick={() => removeServer(it.id)} className="touch-target rounded-md p-2 text-ink-secondary hover:bg-red-50 hover:text-error"><Trash2 size={18} /></button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowUpRight, Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'
import { discountPct, stockOf } from '@/utils/format'
import { isGuestWishlisted, toggleGuestWishlist } from '@/utils/guestWishlist'
import type { Product } from '@/types/product'

export function ProductCard({ product }: { product: Product }) {
  const qc = useQueryClient()
  const toast = useToast()
  const me = useQuery({ queryKey: ['me'], queryFn: api.auth.me, retry: false, staleTime: 60_000 })
  const isGuest = !me.data?.user
  const [liked, setLiked] = useState(() => isGuestWishlisted(product.id))
  const img = product.images?.[0]?.url
  const pct = discountPct(product.basePrice, product.compareAtPrice)
  const inStock = (product.variants || []).some((v) => stockOf(v) > 0) || (product.availableSizes?.length ?? 0) > 0
  const wish = useMutation({
    mutationFn: () => api.wishlist.add(product.id),
    onSuccess: () => { setLiked(true); toast('Added to wishlist'); qc.invalidateQueries({ queryKey: ['wishlist'] }) },
    onError: (e: any) => {
      if (e?.status === 401) { setLiked(true); toast('Saved on this device — sign in to sync') }
      else toast(e?.message || 'Could not save to wishlist', 'error')
    },
  })
  const onHeart = () => {
    if (isGuest) {
      setLiked(toggleGuestWishlist(product))
      toast(liked ? 'Removed from wishlist' : 'Saved on this device — sign in to sync')
    } else if (liked) {
      toast('Manage wishlist items on the Wishlist page')
    } else {
      wish.mutate()
    }
  }
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-brand-border bg-white transition duration-300 hover:-translate-y-1 hover:border-brand-taupe/60 hover:shadow-card">
      <Link to={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-brand-ivory" aria-label={product.name}>
        {img ? (
          <img src={img} alt={product.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.07]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-sand/40 to-brand-ivory text-xs text-ink-secondary">No image</div>
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-brand-charcoal/40 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" aria-hidden />
        {pct ? <span className="absolute left-2 top-2 rounded-full bg-error px-2 py-0.5 text-[11px] font-bold text-white">−{pct}%</span> : null}
        {!inStock && <span className="absolute inset-x-0 bottom-0 bg-brand-charcoal/80 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white">Out of stock</span>}
        <span className="absolute bottom-2 right-2 flex translate-y-1 items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-brand-charcoal opacity-0 shadow-subtle transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          View <ArrowUpRight size={12} />
        </span>
      </Link>
      <button
        type="button"
        aria-label={liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        aria-pressed={liked}
        disabled={wish.isPending}
        onClick={onHeart}
        className="touch-target absolute right-2 top-2 flex items-center justify-center rounded-full bg-white/95 p-2 shadow-subtle transition hover:bg-white active:scale-95"
      >
        <motion.span animate={liked ? { scale: [1, 1.4, 1] } : { scale: 1 }} transition={{ duration: 0.3 }}>
          <Heart size={18} className={liked ? 'fill-error text-error' : 'text-brand-charcoal'} />
        </motion.span>
      </button>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="text-[11px] uppercase tracking-wide text-ink-secondary">{product.category?.name || 'Footwear'}</div>
        <Link to={`/products/${product.slug}`} className="line-clamp-2 text-sm font-medium leading-snug hover:underline">{product.name}</Link>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-heading text-sm font-bold">₱{Number(product.basePrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
          {product.compareAtPrice ? <span className="text-xs text-ink-secondary line-through">₱{Number(product.compareAtPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span> : null}
        </div>
        {product.availableSizes?.length ? <div className="text-[11px] text-ink-secondary">Sizes {product.availableSizes.slice(0, 6).join(', ')}{product.availableSizes.length > 6 ? '…' : ''}</div> : null}
        {product.rating != null ? <div className="text-[11px] text-ink-secondary">★ {product.rating.toFixed(1)}{product.reviewCount ? ` (${product.reviewCount})` : ''}</div> : null}
      </div>
    </article>
  )
}

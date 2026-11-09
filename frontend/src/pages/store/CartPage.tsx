import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2 } from 'lucide-react'
import { api } from '@/services/api'
import { fmt } from '@/utils/format'
import { EmptyState, QuantityStepper } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'

const FREE_SHIP = 2500

export function CartPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const me = useQuery({ queryKey: ['me'], queryFn: api.auth.me, retry: false, refetchOnMount: 'always' })
  const { data, isLoading, error } = useQuery({ queryKey: ['cart'], queryFn: api.cart.get, enabled: !!me.data?.user })
  const items = data?.data?.items || []
  const subtotal = items.reduce((s: number, it: any) => s + Number(it.variant?.price ?? it.variant?.product?.basePrice ?? 0) * it.quantity, 0)
  const progress = Math.min(100, (subtotal / FREE_SHIP) * 100)

  const del = useMutation({
    mutationFn: (id: string) => api.cart.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cart'] }); toast('Removed from bag') },
    onError: (e: any) => toast(e?.message || 'Could not remove item', 'error'),
  })
  const upd = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) => api.cart.update(id, { quantity }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
    onError: (e: any) => toast(e?.message || 'Could not update quantity', 'error'),
  })

  if (me.isLoading || (me.isFetching && !me.data)) return <div className="container-page space-y-4 py-10">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-md" />)}</div>
  if (!me.data?.user) {
    if (me.isError && (me.error as any)?.status !== 401) {
      return <div className="container-page py-10"><EmptyState icon={<ShoppingBag size={28} />} title="Could not load your bag" description={(me.error as Error)?.message || 'Something went wrong. Try again.'} action={<button onClick={() => me.refetch()} className="btn-primary">Retry</button>} /></div>
    }
    return (
      <div className="container-page py-10">
        <h1 className="mb-2 font-heading text-2xl font-bold sm:text-3xl">Shopping Bag</h1>
        <EmptyState icon={<ShoppingBag size={28} />} title="Sign in to view your bag" description="You need to be signed in to add shoes to your bag and check out." action={<div className="flex gap-2"><Link to="/login?next=%2Fcart" className="btn-primary">Sign In</Link><Link to="/register" className="btn-secondary">Create Account</Link></div>} />
      </div>
    )
  }

  if (isLoading) return <div className="container-page space-y-4 py-10">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-md" />)}</div>
  if (error) return <div className="container-page py-10 text-sm text-error">Could not load bag. {(error as Error).message}</div>
  if (items.length === 0) return (
    <div className="container-page py-10">
      <h1 className="mb-2 font-heading text-2xl font-bold sm:text-3xl">Shopping Bag</h1>
      <EmptyState icon={<ShoppingBag size={28} />} title="Your bag is empty" description="Add sizes and colors to get started — your bag will be validated against live stock at checkout." action={<Link to="/shop" className="btn-primary">Continue Shopping</Link>} />
    </div>
  )

  return (
    <div className="container-page pb-28 pt-4 sm:py-10 md:pb-10">
      <h1 className="mb-4 font-heading text-2xl font-bold sm:mb-6 sm:text-3xl">Shopping Bag <span className="text-base font-medium text-ink-secondary">({items.length} item{items.length === 1 ? '' : 's'})</span></h1>

      <div className="mb-5 rounded-md border border-brand-border bg-brand-ivory p-4">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-medium">{subtotal >= FREE_SHIP ? 'You unlocked free shipping!' : `Add ${fmt(FREE_SHIP - subtotal)} more for free shipping`}</span>
          <span className="font-heading font-bold">{fmt(subtotal)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-brand-border" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to free shipping">
          <div className="h-full bg-brand-taupe transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-3">
          {items.map((it: any) => {
            const price = Number(it.variant?.price ?? it.variant?.product?.basePrice ?? 0)
            const stock = (it.variant?.inventory?.quantityOnHand ?? 0) - (it.variant?.inventory?.quantityReserved ?? 0)
            return (
              <li key={it.id} className="card flex gap-4 p-3 sm:p-4">
                <Link to={it.variant?.product?.slug ? `/products/${it.variant.product.slug}` : '/shop'} className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-brand-ivory sm:h-28 sm:w-28">
                  {it.variant?.product?.images?.[0]?.url ? <img src={it.variant.product.images[0].url} alt={it.variant.product.name} className="h-full w-full object-cover" /> : null}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Link to={it.variant?.product?.slug ? `/products/${it.variant.product.slug}` : '/shop'} className="line-clamp-2 text-sm font-semibold hover:underline">{it.variant?.product?.name}</Link>
                    <button aria-label={`Remove ${it.variant?.product?.name || 'item'}`} disabled={del.isPending} onClick={() => del.mutate(it.id)} className="touch-target shrink-0 rounded-md p-1.5 text-ink-secondary hover:bg-red-50 hover:text-error"><Trash2 size={18} /></button>
                  </div>
                  <div className="mt-0.5 text-xs text-ink-secondary">{it.variant?.color?.name} / {it.variant?.size?.label}{it.variant?.sku ? ` • ${it.variant.sku}` : ''}</div>
                  <div className="mt-1 text-sm font-heading font-bold">{fmt(price)}</div>
                  {stock < it.quantity && <div className="mt-1 text-xs font-medium text-error">Only {stock} available — update quantity.</div>}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                    <QuantityStepper value={it.quantity} max={Math.max(1, stock)} disabled={upd.isPending} onChange={(q) => upd.mutate({ id: it.id, quantity: q })} />
                    <span className="text-sm font-semibold">{fmt(price * it.quantity)}</span>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <aside className="card h-fit p-5 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 className="mb-3 font-heading font-bold">Summary</h2>
          <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-semibold">{fmt(subtotal)}</span></div>
          <div className="mt-1 flex justify-between text-xs text-ink-secondary"><span>Shipping</span><span>{subtotal >= FREE_SHIP ? 'Free' : 'Calculated at checkout'}</span></div>
          <p className="mb-4 mt-3 text-xs text-ink-secondary">Discounts and final totals are validated on the server at checkout.</p>
          <Link to="/checkout" className="btn-primary w-full">Proceed to Checkout</Link>
          <Link to="/shop" className="btn-ghost mt-1 w-full">Continue shopping</Link>
        </aside>
      </div>

      {/* Sticky mobile checkout */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div><div className="text-[11px] text-ink-secondary">Subtotal</div><div className="font-heading font-bold">{fmt(subtotal)}</div></div>
          <Link to="/checkout" className="btn-primary flex-1">Checkout</Link>
        </div>
      </div>
    </div>
  )
}

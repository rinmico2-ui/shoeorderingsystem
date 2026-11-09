import { NavLink } from 'react-router-dom'
import { Home, LayoutGrid, Heart, ShoppingBag, User } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { api } from '@/services/api'
import { cn } from '@/utils/cn'

const items = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/shop', label: 'Shop', icon: LayoutGrid },
  { to: '/wishlist', label: 'Wishlist', icon: Heart },
  { to: '/cart', label: 'Bag', icon: ShoppingBag, badge: true },
  { to: '/account', label: 'Account', icon: User },
]

export function BottomNav() {
  const { data } = useQuery({ queryKey: ['cart'], queryFn: api.cart.get, staleTime: 15_000 })
  const count = (data?.data?.items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0)
  return (
    <nav aria-label="Mobile" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-white/95 backdrop-blur md:hidden">
      <ul className="grid grid-cols-5">
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink to={to} end={end} aria-label={label}
              className={({ isActive }) => cn('relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition', isActive ? 'text-brand-charcoal' : 'text-ink-secondary hover:text-brand-charcoal')}>
              {({ isActive }) => (
                <>
                  <span className={cn('flex flex-col items-center gap-0.5 rounded-md px-3 py-1 transition', isActive && 'bg-brand-ivory')}>
                    <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                    {label}
                  </span>
                  {isActive && <motion.span layoutId="bottom-nav-pill" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-charcoal" />}
                  {badge && count > 0 && (
                    <motion.span key={count} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                      className="absolute right-[calc(50%-18px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                      {count > 99 ? '99+' : count}
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { Link, NavLink, Outlet } from 'react-router-dom'
import { Heart, Search, ShoppingBag, User } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api'
import { BottomNav } from '@/components/BottomNav'
import { SearchOverlay } from '@/components/SearchOverlay'
import { PageTransition } from '@/components/PageTransition'

export function StoreLayout() {
  const [searchOpen, setSearchOpen] = useState(false)
  const { data } = useQuery({ queryKey: ['cart'], queryFn: api.cart.get, staleTime: 15_000 })
  const cartCount = (data?.data?.items || []).reduce((s: number, it: any) => s + (it.quantity || 0), 0)

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-40 border-b border-brand-border bg-white/95 backdrop-blur">
        <div className="container-page flex h-14 items-center justify-between gap-3 md:h-16">
          <Link to="/" className="font-heading text-base font-extrabold tracking-tight sm:text-lg" aria-label="Khyleene's Collection home">
            Khyleene's <span className="text-brand-taupe">Collection</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
            <NavLink to="/shop" className={({ isActive }) => isActive ? 'font-semibold' : 'text-brand-charcoal/80 hover:text-brand-charcoal'}>Shop</NavLink>
            <NavLink to="/shop?sort=newest" className="text-brand-charcoal/80 hover:text-brand-charcoal">New Arrivals</NavLink>
            <NavLink to="/shop?sort=best" className="text-brand-charcoal/80 hover:text-brand-charcoal">Best Sellers</NavLink>
            <NavLink to="/track" className="text-brand-charcoal/80 hover:text-brand-charcoal">Track Order</NavLink>
          </nav>
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button type="button" onClick={() => setSearchOpen(true)} className="touch-target flex items-center justify-center rounded-md p-2 hover:bg-brand-ivory" aria-label="Search products"><Search size={20} /></button>
            <Link to="/wishlist" className="touch-target hidden items-center justify-center rounded-md p-2 hover:bg-brand-ivory sm:flex" aria-label="Wishlist"><Heart size={20} /></Link>
            <Link to="/account" className="touch-target hidden items-center justify-center rounded-md p-2 hover:bg-brand-ivory sm:flex" aria-label="Account"><User size={20} /></Link>
            <Link to="/cart" className="touch-target relative flex items-center justify-center rounded-md p-2 hover:bg-brand-ivory" aria-label={`Shopping bag, ${cartCount} items`}>
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">{cartCount > 99 ? '99+' : cartCount}</span>}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>

      <footer className="mt-16 bg-brand-charcoal text-brand-ivory">
        <div className="container-page grid gap-8 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-3 font-heading font-bold text-white">Khyleene's Collection</div>
            <p className="text-brand-sand/80">Premium footwear for everyday style. Quality, reliability, and convenience.</p>
          </div>
          <nav aria-label="Shop footer" className="flex flex-col gap-2">
            <div className="mb-1 font-semibold text-white">Shop</div>
            <Link to="/shop" className="text-brand-sand/80 hover:text-white">All Shoes</Link>
            <Link to="/shop?sort=newest" className="text-brand-sand/80 hover:text-white">New Arrivals</Link>
            <Link to="/shop?sort=best" className="text-brand-sand/80 hover:text-white">Best Sellers</Link>
            <Link to="/wishlist" className="text-brand-sand/80 hover:text-white">Wishlist</Link>
          </nav>
          <nav aria-label="Support footer" className="flex flex-col gap-2">
            <div className="mb-1 font-semibold text-white">Support</div>
            <Link to="/track" className="text-brand-sand/80 hover:text-white">Track Order</Link>
            <Link to="/account" className="text-brand-sand/80 hover:text-white">My Account</Link>
            <Link to="/login" className="text-brand-sand/80 hover:text-white">Sign In</Link>
          </nav>
          <div>
            <div className="mb-3 font-semibold text-white">Contact</div>
            <p className="text-brand-sand/80">Philippines<br />support@khyleenescollection.com</p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-brand-sand/70">© {new Date().getFullYear()} Khyleene's Collection. All rights reserved.</div>
      </footer>

      <BottomNav />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

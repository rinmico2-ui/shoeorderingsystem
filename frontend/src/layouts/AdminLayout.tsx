import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingCart, Star, Tag, Users, X } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { useToast } from '@/contexts/ToastContext'

const nav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/promotions', label: 'Promotions', icon: Tag },
  { to: '/admin/reviews', label: 'Reviews', icon: Star },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex-1 space-y-1 p-3">
      {nav.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}
          className={({ isActive }) => `touch-target flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${isActive ? 'bg-white/10 font-semibold text-white' : 'text-brand-sand/80 hover:bg-white/5 hover:text-white'}`}>
          <Icon size={18} aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AdminLayout() {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const me = useQuery({ queryKey: ['me'], queryFn: api.auth.me, retry: false })
  const user = me.data?.user
  const isStaff = ['SUPER_ADMIN', 'STORE_MANAGER', 'ORDER_STAFF', 'INVENTORY_STAFF'].includes(user?.role || '')
  const logout = async () => {
    try { await api.auth.logout() } catch {}
    qc.invalidateQueries({ queryKey: ['me'] })
    toast('Signed out')
    nav('/admin/login')
  }
  return (
    <div className="flex min-h-dvh bg-brand-ivory/40">
      <aside aria-label="Admin sidebar" className="hidden w-64 shrink-0 flex-col bg-brand-charcoal text-white lg:flex">
        <div className="flex h-16 items-center px-5 font-heading font-bold">
          <Link to="/admin">Khyleene <span className="text-brand-taupe">Admin</span></Link>
        </div>
        <NavList />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button aria-label="Close navigation" className="absolute inset-0 bg-brand-charcoal/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-brand-charcoal text-white shadow-sheet">
            <div className="flex h-16 items-center justify-between px-5 font-heading font-bold">
              Khyleene Admin
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="touch-target flex items-center justify-center rounded-md hover:bg-white/10"><X size={20} /></button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top sticky top-0 z-40 flex h-16 items-center justify-between border-b border-brand-border bg-white px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} aria-label="Open admin menu" className="touch-target flex items-center justify-center rounded-md p-2 hover:bg-brand-ivory lg:hidden"><Menu size={20} /></button>
            <span className="text-sm font-semibold">Admin Console</span>
          </div>
          {user && isStaff ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-right sm:block">
                <span className="block text-xs font-semibold leading-tight">{user.fullName}</span>
                <span className="block text-[11px] text-ink-secondary">{user.role?.replace(/_/g, ' ')}</span>
              </span>
              <button onClick={logout} className="touch-target flex items-center gap-1.5 rounded-md px-2 text-sm text-brand-charcoal/70 hover:text-brand-charcoal">
                <LogOut size={16} /> Sign out
              </button>
            </div>
          ) : (
            <NavLink to="/admin/login" className="touch-target flex items-center rounded-md px-2 text-sm text-brand-charcoal/70 hover:text-brand-charcoal">Sign in</NavLink>
          )}
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

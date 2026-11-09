import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '@/services/api'
import { fmt } from '@/utils/format'
import { StatusBadge } from '@/components/ui'

export function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['adminDash'], queryFn: api.admin.dashboard, retry: false })
  const reports = useQuery({ queryKey: ['admRep'], queryFn: () => api.admin.reports(), retry: false })
  const d = data?.data
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Admin access required. <Link className="font-semibold text-brand-taupe" to="/admin/login">Sign in</Link>. {(error as Error).message}</div>

  const cards = [
    ['Total Revenue', d ? fmt(Number(d.totalRevenue)) : '—'],
    ['Total Orders', d?.totalOrders ?? '—'],
    ['Total Products', d?.totalProducts ?? '—'],
    ['Total Customers', d?.totalCustomers ?? '—'],
    ['Pending Orders', d?.pendingOrders ?? '—'],
    ['Low Stock', d?.lowStockProducts ?? '—'],
    ['Completed', d?.completedOrders ?? '—'],
    ['Cancelled', d?.cancelledOrders ?? '—'],
  ]
  const byStatus = (reports.data?.data?.byStatus || []).map((s: any) => ({ name: String(s.status).replace(/_/g, ' '), orders: s._count?._all ?? 0 }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-brand-charcoal/70">Metrics from live database records.</p>
      </div>
      {isLoading && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-md" />)}</div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([k, v]) => (
          <div key={String(k)} className="card p-4">
            <div className="mb-1 text-xs text-ink-secondary">{k}</div>
            <div className="font-heading text-xl font-bold">{v}</div>
          </div>
        ))}
      </div>

      {byStatus.length > 0 && (
        <section className="card p-4 sm:p-5" aria-label="Orders by status">
          <h2 className="mb-3 font-heading font-semibold">Orders by status</h2>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStatus} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="orders" fill="#A58D79" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="card p-4 sm:p-5" aria-label="Recent orders">
        <h2 className="mb-3 font-heading font-semibold">Recent Orders</h2>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="text-left text-ink-secondary"><tr><th className="py-2">Order</th><th>Status</th><th>Customer</th><th>Total</th></tr></thead>
            <tbody>
              {(d?.recentOrders || []).map((o: any) => (
                <tr key={o.id} className="border-t border-brand-border">
                  <td className="py-2 font-medium">{o.orderNumber}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td>{o.user?.fullName || o.guestEmail || 'Guest'}</td>
                  <td>{fmt(Number(o.grandTotal))}</td>
                </tr>
              ))}
              {!d?.recentOrders?.length && <tr><td className="py-3 text-ink-secondary" colSpan={4}>No orders yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {(d?.recentOrders || []).map((o: any) => (
            <div key={o.id} className="rounded-md border border-brand-border p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{o.orderNumber}</span><span className="text-sm font-bold">{fmt(Number(o.grandTotal))}</span></div>
              <div className="mt-1 flex items-center gap-2 text-xs text-ink-secondary"><StatusBadge status={o.status} /><span>{o.user?.fullName || o.guestEmail || 'Guest'}</span></div>
            </div>
          ))}
          {!d?.recentOrders?.length && <p className="text-sm text-ink-secondary">No orders yet.</p>}
        </div>
      </section>
    </div>
  )
}

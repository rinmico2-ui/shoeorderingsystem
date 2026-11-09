import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'

export function AdminInventoryPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['adminInv'], queryFn: api.admin.inventory, retry: false })
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Inventory access required (SUPER_ADMIN/STORE_MANAGER/INVENTORY_STAFF). <Link className="font-semibold text-brand-taupe" to="/admin/login">Sign in</Link>.</div>
  const rows = data?.data || []
  const low = rows.filter((r: any) => r.quantityOnHand - r.quantityReserved <= (r.lowStockThreshold || 5)).length
  return (
    <div>
      <h1 className="mb-2 font-heading text-2xl font-bold">Inventory Management</h1>
      <p className="mb-4 text-sm text-brand-charcoal/70">Live stock per variant. Adjustments are audited via inventory movements (server-side). {low > 0 && <span className="font-semibold text-warning">{low} low-stock variant{low === 1 ? '' : 's'}</span>}</p>
      {isLoading ? <div className="skeleton h-40 w-full rounded-md" /> : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm"><thead className="text-left text-ink-secondary"><tr><th className="p-3">Product</th><th>Variant</th><th>SKU</th><th>On hand</th><th>Reserved</th><th>Available</th></tr></thead>
              <tbody>{rows.map((r: any) => { const avail = r.quantityOnHand - r.quantityReserved; const isLow = avail <= (r.lowStockThreshold || 5); return <tr key={r.id} className="border-t border-brand-border"><td className="p-3 font-medium">{r.variant?.product?.name}</td><td>{r.variant?.color?.name} / {r.variant?.size?.label}</td><td className="text-xs">{r.variant?.sku}</td><td>{r.quantityOnHand}</td><td>{r.quantityReserved}</td><td className={isLow ? 'font-semibold text-warning' : 'text-success'}>{avail}{isLow ? ' — low' : ''}</td></tr> })}
              {!rows.length && <tr><td className="p-3 text-ink-secondary" colSpan={6}>No inventory yet. Run migrations + seed.</td></tr>}</tbody></table>
          </div>
          <div className="space-y-3 md:hidden">
            {rows.map((r: any) => { const avail = r.quantityOnHand - r.quantityReserved; const isLow = avail <= (r.lowStockThreshold || 5); return (
              <div key={r.id} className="card p-4">
                <div className="text-sm font-semibold">{r.variant?.product?.name}</div>
                <div className="text-xs text-ink-secondary">{r.variant?.color?.name} / {r.variant?.size?.label} • {r.variant?.sku}</div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span>On hand {r.quantityOnHand} • Reserved {r.quantityReserved}</span>
                  <span className={isLow ? 'font-semibold text-warning' : 'font-semibold text-success'}>{avail} available</span>
                </div>
              </div> ) })}
            {!rows.length && <p className="text-sm text-ink-secondary">No inventory yet. Run migrations + seed.</p>}
          </div>
        </>
      )}
    </div>
  )
}

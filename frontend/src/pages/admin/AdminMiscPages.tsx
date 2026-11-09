import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/services/api'
import { fmt } from '@/utils/format'
import { StatusBadge } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'

function Denied() { return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Manager access required.</div> }

export function AdminCustomersPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admCust'], queryFn: () => api.admin.customers(), retry: false })
  if (error) return <Denied />
  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-bold">Customers</h1>
      {isLoading ? <div className="skeleton h-40 w-full rounded-md" /> : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm"><thead className="text-left text-ink-secondary"><tr><th className="p-3">Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Joined</th></tr></thead>
              <tbody>{(data?.data || []).map((c: any) => <tr key={c.id} className="border-t border-brand-border"><td className="p-3 font-medium">{c.fullName}</td><td>{c.email}</td><td>{c.phone || '-'}</td><td>{c._count?.orders ?? 0}</td><td>{new Date(c.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table>
          </div>
          <div className="space-y-3 md:hidden">
            {(data?.data || []).map((c: any) => <div key={c.id} className="card p-4"><div className="text-sm font-semibold">{c.fullName}</div><div className="text-xs text-ink-secondary">{c.email}</div><div className="mt-1 text-xs">{c._count?.orders ?? 0} orders • Joined {new Date(c.createdAt).toLocaleDateString()}</div></div>)}
            {!(data?.data || []).length && <p className="text-sm text-ink-secondary">No customers yet.</p>}
          </div>
        </>
      )}
    </div>
  )
}

export function AdminPromotionsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['admCoupons'], queryFn: () => api.get<any>('/admin/coupons'), retry: false })
  const [f, setF] = useState({ code: '', type: 'percent', value: '10' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  if (error) return <Denied />
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try { await api.post('/admin/coupons', { ...f, value: Number(f.value), code: f.code.toUpperCase() }); setMsg('Saved (server-validated at checkout).') ; qc.invalidateQueries({ queryKey: ['admCoupons'] }); toast('Coupon saved') }
    catch (ex: any) { setMsg(ex?.message || 'Failed') }
    finally { setSaving(false) }
  }
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Promotions & Discounts</h1>
      <form onSubmit={save} className="card flex flex-wrap items-end gap-2 p-4 text-sm">
        <input className="input w-36" placeholder="CODE" aria-label="Coupon code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} required />
        <select className="input w-36" aria-label="Coupon type" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="percent">Percent</option><option value="fixed">Fixed (PHP)</option></select>
        <input className="input w-28" type="number" inputMode="decimal" aria-label="Coupon value" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
        <button className="btn-primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save'}</button>
        {msg && <span className="text-xs">{msg}</span>}
      </form>
      {isLoading ? <div className="skeleton h-40 w-full rounded-md" /> : (
        <div className="card hidden overflow-x-auto md:block">
          <table className="w-full text-sm"><thead className="text-left text-ink-secondary"><tr><th className="p-3">Code</th><th>Type</th><th>Value</th><th>Used</th><th>Active</th></tr></thead>
            <tbody>{(data?.data || []).map((c: any) => <tr key={c.id} className="border-t border-brand-border"><td className="p-3 font-medium">{c.code}</td><td>{c.type}</td><td>{c.type === 'percent' ? `${c.value}%` : fmt(Number(c.value))}</td><td>{c.usedCount}</td><td><StatusBadge status={c.isActive ? 'DELIVERED' : 'CANCELLED'} /></td></tr>)}</tbody></table>
        </div>
      )}
      {!isLoading && <div className="space-y-3 md:hidden">{(data?.data || []).map((c: any) => <div key={c.id} className="card p-4 text-sm"><span className="font-semibold">{c.code}</span> • {c.type === 'percent' ? `${c.value}%` : fmt(Number(c.value))} • Used {c.usedCount}</div>)}</div>}
    </div>
  )
}

export function AdminReviewsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['admRev'], queryFn: () => api.get<any>('/admin/reviews'), retry: false })
  if (error) return <Denied />
  const mod = async (id: string, isApproved: boolean) => { try { await api.put(`/admin/reviews/${id}`, { isApproved }); qc.invalidateQueries({ queryKey: ['admRev'] }); toast(isApproved ? 'Review approved' : 'Review hidden') } catch (e: any) { toast(e?.message || 'Failed', 'error') } }
  return (
    <div>
      <h1 className="mb-4 font-heading text-2xl font-bold">Reviews Moderation</h1>
      {isLoading ? <div className="skeleton h-40 w-full rounded-md" /> : (
        <div className="space-y-3">
          {(data?.data || []).map((r: any) => (
            <div key={r.id} className="card p-4 text-sm">
              <div className="font-semibold">{r.product?.name} — {r.rating}/5 {r.isVerifiedPurchase && <span className="text-xs text-success">(verified)</span>}</div>
              <div className="text-brand-charcoal/70">{r.user?.fullName}: {r.comment || '-'}</div>
              <div className="mt-2 flex items-center gap-2">
                <button className="btn-secondary px-3 py-1 text-xs" onClick={() => mod(r.id, true)}>Approve</button>
                <button className="btn-secondary px-3 py-1 text-xs" onClick={() => mod(r.id, false)}>Hide</button>
                <StatusBadge status={r.isApproved ? 'DELIVERED' : 'PENDING'} />
              </div>
            </div>
          ))}
          {!data?.data?.length && <p className="text-sm text-ink-secondary">No reviews.</p>}
        </div>
      )}
    </div>
  )
}

export function AdminReportsPage() {
  const { data, isLoading, error } = useQuery({ queryKey: ['admRep'], queryFn: () => api.admin.reports(), retry: false })
  if (error) return <Denied />
  const t = data?.data?.totals
  return (
    <div className="space-y-4">
      <div><h1 className="font-heading text-2xl font-bold">Reports & Analytics</h1><p className="text-sm text-brand-charcoal/70">Real database aggregates.</p></div>
      {isLoading ? <div className="skeleton h-40 w-full rounded-md" /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([['Subtotal', t?.subtotal], ['Discounts', t?.discountTotal], ['Shipping', t?.shippingTotal], ['Grand Total', t?.grandTotal]] as const).map(([k, v]) => (
              <div key={k} className="card p-4"><div className="text-xs text-ink-secondary">{k}</div><div className="font-heading text-lg font-bold">{fmt(Number(v || 0))}</div></div>
            ))}
          </div>
          <div className="card p-4">
            <div className="mb-2 font-semibold text-sm">By status</div>
            <div className="space-y-1 text-sm">{(data?.data?.byStatus || []).map((s: any) => <div key={s.status} className="flex justify-between"><span>{s.status}</span><span>{s._count._all}</span></div>)}</div>
          </div>
        </>
      )}
    </div>
  )
}

export function AdminSettingsPage() {
  const { data, error } = useQuery({ queryKey: ['admSet'], queryFn: () => api.get<any>('/admin/settings'), retry: false })
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Manager/Super Admin access required.</div>
  return (
    <div className="space-y-4">
      <div><h1 className="font-heading text-2xl font-bold">Settings</h1><p className="text-sm text-brand-charcoal/70">Store settings (key/value). Manual COD/GCash/Bank Transfer with proof-of-receipt and admin verification (RBAC, audited).</p></div>
      <div className="card p-4 text-sm">
        <div className="mb-2 font-semibold">Current settings keys</div>
        <ul className="list-disc space-y-1 pl-5 text-brand-charcoal/70">
          {(data?.data || []).map((s: any) => <li key={s.key}>{s.key}</li>)}
          {!data?.data?.length && <li>None yet. Add keys like <code>gcash_name</code>, <code>gcash_number</code>, <code>bank_name</code>, <code>bank_account_name</code>, <code>bank_account_number</code> via API to show payment instructions.</li>}
        </ul>
      </div>
    </div>
  )
}

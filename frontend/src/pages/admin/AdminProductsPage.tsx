import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'
import { fmt } from '@/utils/format'
import { StatusBadge } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'
import { Modal } from '@/components/overlay'

export function AdminProductsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data, isLoading, error } = useQuery({ queryKey: ['adminProducts'], queryFn: () => api.get<any>('/admin/products'), retry: false })
  const cats = useQuery({ queryKey: ['adminCats'], queryFn: () => api.get<any>('/admin/categories'), retry: false })
  const [form, setForm] = useState({ name: '', categoryId: '', basePrice: '', description: '', isPublished: true })
  const [imageUrls, setImageUrls] = useState('')
  const [editTarget, setEditTarget] = useState<any>(null)
  const [editImages, setEditImages] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editPublished, setEditPublished] = useState(true)
  const [editBusy, setEditBusy] = useState(false)
  const imageList = imageUrls.split('\n').map((u) => u.trim()).filter(Boolean)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (cats.data?.data?.[0] && !form.categoryId) setForm((f) => ({ ...f, categoryId: cats.data.data[0].id })) }, [cats.data, form.categoryId])
  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-error">Manager access required. <Link className="font-semibold text-brand-taupe" to="/admin/login">Sign in</Link>.</div>

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(''); setSaving(true)
    try {
      await api.post('/admin/products', { ...form, basePrice: Number(form.basePrice), ...(imageList.length ? { images: imageList } : {}) })
      setMsg(imageList.length ? `Product created with ${imageList.length} image(s). Add variants via API/admin tools.` : 'Product created (no images). Add variants via API/admin tools.')
      setForm((f) => ({ ...f, name: '', basePrice: '', description: '' }))
      setImageUrls('')
      qc.invalidateQueries({ queryKey: ['adminProducts'] })
      toast('Product created')
    } catch (ex: any) { setMsg(ex?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const openEdit = async (p: any) => {
    setEditTarget(p)
    setEditPrice(String(p.basePrice))
    setEditPublished(!!p.isPublished)
    setEditImages('')
    try {
      const detail = await api.products.get(p.slug)
      setEditImages(((detail.data?.images || []) as any[]).map((im: any) => im.url).join('\n'))
    } catch { /* keep empty — admin can paste fresh URLs */ }
  }
  const saveEdit = async () => {
    if (!editTarget) return
    setEditBusy(true)
    try {
      await api.put(`/admin/products/${editTarget.id}`, {
        basePrice: Number(editPrice),
        isPublished: editPublished,
        images: editImages.split('\n').map((u) => u.trim()).filter(Boolean),
      })
      qc.invalidateQueries({ queryKey: ['adminProducts'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      toast('Product updated')
      setEditTarget(null)
    } catch (ex: any) { toast(ex?.message || 'Update failed', 'error') }
    finally { setEditBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div><h1 className="font-heading text-2xl font-bold">Product Management</h1><p className="text-sm text-brand-charcoal/70">Create/update/archive products (server-validated, RBAC). Images accept URLs.</p></div>
      <form onSubmit={submit} className="card grid gap-3 p-4 text-sm sm:grid-cols-2">
        <div className="font-semibold sm:col-span-2">Create product</div>
        <input className="input" placeholder="Name" aria-label="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <input className="input" placeholder="Base price (PHP)" aria-label="Base price" type="number" inputMode="decimal" value={form.basePrice} onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))} required />
        <select className="input" aria-label="Category" value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>{(cats.data?.data || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="h-5 w-5 accent-[#202020]" /> Published</label>
        <textarea className="input sm:col-span-2" placeholder="Description" aria-label="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-secondary" htmlFor="product-images">Product image URLs (one per line)</label>
          <textarea id="product-images" className="input" rows={3} placeholder={'https://example.com/shoe-side.jpg\nhttps://example.com/shoe-top.jpg'} value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} />
          <p className="mt-1 text-xs text-ink-secondary">Host the photos (Cloudinary, Imgur, your own CDN…) and paste the direct URLs. First image is the main card photo.</p>
          {imageList.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {imageList.map((u) => (
                <img key={u} src={u} alt="Preview" className="h-16 w-16 rounded-md border border-brand-border object-cover" loading="lazy" />
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>{msg && <span className="text-xs text-brand-charcoal/70">{msg}</span>}</div>
      </form>

      {isLoading ? <div className="skeleton h-40 w-full rounded-md" /> : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full text-sm"><thead className="text-left text-ink-secondary"><tr><th className="p-3">Name</th><th>Category</th><th>Price</th><th>Variants</th><th>Status</th><th></th></tr></thead>
              <tbody>{(data?.data || []).map((p: any) => <tr key={p.id} className="border-t border-brand-border"><td className="p-3 font-medium">{p.name}</td><td>{p.category?.name}</td><td>{fmt(Number(p.basePrice))}</td><td>{p.variants?.length || 0}</td><td><StatusBadge status={p.isArchived ? 'CANCELLED' : p.isPublished ? 'DELIVERED' : 'PENDING'} /></td><td><button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => openEdit(p)}>Edit</button></td></tr>)}
              {!data?.data?.length && <tr><td className="p-3 text-ink-secondary" colSpan={5}>No products. Run seed or create one.</td></tr>}</tbody></table>
          </div>
          <div className="space-y-3 md:hidden">
            {(data?.data || []).map((p: any) => (
              <div key={p.id} className="card p-4">
                <div className="font-semibold">{p.name}</div>
                <div className="mt-1 flex items-center justify-between text-sm"><span className="text-ink-secondary">{p.category?.name} • {p.variants?.length || 0} variants</span><span className="font-bold">{fmt(Number(p.basePrice))}</span></div>
                <div className="mt-2 flex items-center justify-between">
                  <StatusBadge status={p.isArchived ? 'CANCELLED' : p.isPublished ? 'DELIVERED' : 'PENDING'} />
                  <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => openEdit(p)}>Edit</button>
                </div>
              </div>
            ))}
            {!data?.data?.length && <p className="text-sm text-ink-secondary">No products. Run seed or create one.</p>}
          </div>
        </>
      )}

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={editTarget ? `Edit — ${editTarget.name}` : 'Edit product'}>
        <div className="space-y-4 text-sm">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-secondary" htmlFor="edit-images">Product image URLs (one per line)</label>
            <textarea id="edit-images" className="input" rows={4} placeholder="https://…/shoe.jpg" value={editImages} onChange={(e) => setEditImages(e.target.value)} />
            <p className="mt-1 text-xs text-ink-secondary">FIRST URL is the main photo. Saving **replaces** the product's photos. Leave empty to remove all photos.</p>
            {editImages.split('\n').map((u) => u.trim()).filter(Boolean).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {editImages.split('\n').map((u) => u.trim()).filter(Boolean).map((u) => (
                  <img key={u} src={u} alt="Preview" className="h-16 w-16 rounded-md border border-brand-border object-cover" loading="lazy" />
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" inputMode="decimal" aria-label="Base price" placeholder="Base price (PHP)" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
            <label className="flex items-center gap-2"><input type="checkbox" checked={editPublished} onChange={(e) => setEditPublished(e.target.checked)} className="h-5 w-5 accent-[#202020]" /> Published</label>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={() => setEditTarget(null)}>Cancel</button>
            <button className="btn-primary flex-1" disabled={editBusy} onClick={saveEdit}>{editBusy ? 'Saving…' : 'Save changes'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

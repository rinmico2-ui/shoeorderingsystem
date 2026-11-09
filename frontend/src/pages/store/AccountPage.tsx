import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, Heart, LogOut, MapPin, Package, ChevronRight, User, Plus, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { api } from '@/services/api'
import { fmt } from '@/utils/format'
import { EmptyState, StatusBadge } from '@/components/ui'
import { useToast } from '@/contexts/ToastContext'

export function AccountPage() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [view, setView] = useState<'main' | 'addresses' | 'notifications' | 'security'>('main')
  const me = useQuery({ queryKey: ['me'], queryFn: api.auth.me, retry: false })
  const orders = useQuery({ queryKey: ['myOrders'], queryFn: api.orders.my, enabled: !!me.data?.user, retry: false })
  const addresses = useQuery({ queryKey: ['addresses'], queryFn: api.account.addresses, enabled: !!me.data?.user && view === 'addresses', retry: false })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: api.account.notifications, enabled: !!me.data?.user && view === 'notifications', retry: false })

  const [addrForm, setAddrForm] = useState({ label: '', fullName: '', phone: '', city: '', street: '', isDefault: false })
  const [savingAddr, setSavingAddr] = useState(false)

  if (me.isLoading) return <div className="container-page space-y-4 py-10"><div className="skeleton h-20 w-full" /><div className="skeleton h-40 w-full" /></div>
  if (!me.data?.user) return (
    <div className="container-page py-10">
      <EmptyState icon={<User size={28} />} title="Welcome to Khyleene's Collection" description="Sign in to track orders, manage your wishlist, and check out faster." action={<div className="flex gap-2"><Link to="/login" className="btn-primary">Sign In</Link><Link to="/register" className="btn-secondary">Create Account</Link></div>} />
    </div>
  )

  const u = me.data.user
  const logout = async () => { try { await api.auth.logout() } catch {} nav('/') }

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingAddr(true)
    try { await api.account.addAddress(addrForm); setAddrForm({ label: '', fullName: '', phone: '', city: '', street: '', isDefault: false }); qc.invalidateQueries({ queryKey: ['addresses'] }); toast('Address saved') }
    catch (err: any) { toast(err?.message || 'Could not save address', 'error') }
    finally { setSavingAddr(false) }
  }
  const deleteAddress = async (id: string) => { try { await api.account.deleteAddress(id); qc.invalidateQueries({ queryKey: ['addresses'] }); toast('Address removed') } catch (e: any) { toast(e?.message || 'Could not remove', 'error') } }
  const markRead = async (id: string) => { try { await api.account.markNotificationRead(id); qc.invalidateQueries({ queryKey: ['notifications'] }) } catch {} }

  const row = (to: string, icon: React.ReactNode, label: string, hint?: string) => (
    <Link to={to} className="touch-target flex items-center gap-3 border-b border-brand-border px-4 py-3.5 last:border-0 hover:bg-brand-ivory">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ivory text-brand-taupe">{icon}</span>
      <span className="flex-1"><span className="block text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-ink-secondary">{hint}</span>}</span>
      <ChevronRight size={16} className="text-ink-secondary" />
    </Link>
  )

  return (
    <div className="container-page pb-10 pt-4 sm:pt-10">
      {view === 'security' && (
        <SecurityView user={u} onBack={() => setView('main')} refetchMe={() => qc.invalidateQueries({ queryKey: ['me'] })} />
      )}

      {view === 'addresses' && (
        <div className="mx-auto max-w-2xl">
          <button onClick={() => setView('main')} className="mb-4 text-sm font-semibold text-brand-taupe hover:underline">← Back to account</button>
          <h1 className="mb-4 font-heading text-xl font-bold">Saved Addresses</h1>
          {addresses.isLoading && <div className="skeleton h-20 w-full" />}
          {(addresses.data?.data || []).map((a: any) => (
            <div key={a.id} className="card mb-3 flex items-start justify-between gap-3 p-4 text-sm">
              <div>
                <div className="font-semibold">{a.label || 'Address'} {a.isDefault && <span className="ml-1 rounded-full bg-brand-ivory px-2 py-0.5 text-[11px]">Default</span>}</div>
                <div className="text-ink-secondary">{a.fullName} • {a.phone}</div>
                <div>{[a.street, a.barangay, a.city, a.province, a.region, a.postalCode].filter(Boolean).join(', ')}</div>
              </div>
              <button aria-label="Delete address" onClick={() => deleteAddress(a.id)} className="touch-target rounded-md p-2 text-ink-secondary hover:bg-red-50 hover:text-error"><Trash2 size={18} /></button>
            </div>
          ))}
          {addresses.data && !(addresses.data.data || []).length && <p className="mb-4 text-sm text-ink-secondary">No saved addresses yet.</p>}
          <form onSubmit={saveAddress} className="card space-y-3 p-4">
            <div className="font-semibold">Add address</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" placeholder="Label (e.g., Home)" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} />
              <input className="input" placeholder="Full name" required value={addrForm.fullName} onChange={(e) => setAddrForm({ ...addrForm, fullName: e.target.value })} />
              <input className="input" type="tel" inputMode="tel" placeholder="Phone" required value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} />
              <input className="input" placeholder="City / Municipality" required value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
              <input className="input sm:col-span-2" placeholder="Street address" required value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={addrForm.isDefault} onChange={(e) => setAddrForm({ ...addrForm, isDefault: e.target.checked })} className="h-5 w-5 accent-[#202020]" /> Set as default</label>
            <button className="btn-primary w-full" disabled={savingAddr} type="submit"><Plus size={16} /> {savingAddr ? 'Saving…' : 'Save Address'}</button>
          </form>
        </div>
      )}

      {view === 'notifications' && (
        <div className="mx-auto max-w-2xl">
          <button onClick={() => setView('main')} className="mb-4 text-sm font-semibold text-brand-taupe hover:underline">← Back to account</button>
          <h1 className="mb-4 font-heading text-xl font-bold">Notifications</h1>
          {notifications.isLoading && <div className="skeleton h-20 w-full" />}
          <ul className="space-y-3">
            {(notifications.data?.data || []).map((n: any) => (
              <li key={n.id} className={`card p-4 text-sm ${n.isRead ? '' : 'border-brand-taupe/50 bg-brand-ivory/50'}`}>
                <div className="flex items-start justify-between gap-3"><span className="font-medium">{n.title || 'Notification'}</span><span className="text-xs text-ink-secondary">{new Date(n.createdAt).toLocaleDateString()}</span></div>
                {n.body && <p className="mt-1 text-brand-charcoal/75">{n.body}</p>}
                {!n.isRead && <button onClick={() => markRead(n.id)} className="mt-2 text-xs font-semibold text-brand-taupe hover:underline">Mark as read</button>}
              </li>
            ))}
          </ul>
          {notifications.data && !(notifications.data.data || []).length && <p className="text-sm text-ink-secondary">No notifications yet.</p>}
        </div>
      )}

      {view === 'main' && (
        <div className="mx-auto max-w-3xl">
          <div className="card mb-5 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-charcoal font-heading text-lg font-bold text-white">{(u.fullName || 'K').charAt(0).toUpperCase()}</span>
              <div><h1 className="font-heading text-xl font-bold">{u.fullName}</h1><p className="text-sm text-ink-secondary">{u.email}{u.phone ? ` • ${u.phone}` : ''}</p></div>
            </div>
            <button onClick={logout} className="btn-secondary"><LogOut size={16} /> Sign out</button>
          </div>

          <div className="card mb-5 overflow-hidden">
            {row('/wishlist', <Heart size={18} />, 'My Wishlist', 'Saved pairs')}
            <button onClick={() => setView('addresses')} className="touch-target flex w-full items-center gap-3 border-b border-brand-border px-4 py-3.5 text-left hover:bg-brand-ivory">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ivory text-brand-taupe"><MapPin size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-medium">Saved Addresses</span><span className="block text-xs text-ink-secondary">Manage delivery addresses</span></span>
              <ChevronRight size={16} className="text-ink-secondary" />
            </button>
            <button onClick={() => setView('security')} className="touch-target flex w-full items-center gap-3 border-b border-brand-border px-4 py-3.5 text-left hover:bg-brand-ivory">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ivory text-brand-taupe"><ShieldCheck size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-medium">Two-Factor Authentication</span><span className="block text-xs text-ink-secondary">{u.twoFactorEnabled ? 'Enabled — authenticator app required at sign in' : 'Off — add an extra sign-in step'}</span></span>
              <ChevronRight size={16} className="text-ink-secondary" />
            </button>
            <button onClick={() => setView('notifications')} className="touch-target flex w-full items-center gap-3 border-b border-brand-border px-4 py-3.5 text-left hover:bg-brand-ivory">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ivory text-brand-taupe"><Bell size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-medium">Notifications</span><span className="block text-xs text-ink-secondary">Order and account updates</span></span>
              <ChevronRight size={16} className="text-ink-secondary" />
            </button>
            <Link to="/track" className="touch-target flex items-center gap-3 px-4 py-3.5 hover:bg-brand-ivory">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-ivory text-brand-taupe"><Package size={18} /></span>
              <span className="flex-1"><span className="block text-sm font-medium">Track Order</span><span className="block text-xs text-ink-secondary">Enter an order number</span></span>
              <ChevronRight size={16} className="text-ink-secondary" />
            </Link>
          </div>

          <section aria-label="My orders">
            <h2 className="mb-3 font-heading text-lg font-bold">My Orders</h2>
            {orders.isLoading && <div className="skeleton h-24 w-full" />}
            {orders.data && !(orders.data.data || []).length && <p className="text-sm text-ink-secondary">No orders yet. <Link to="/shop" className="font-semibold text-brand-taupe hover:underline">Start shopping</Link></p>}
            <div className="space-y-3">
              {(orders.data?.data || []).map((o: any) => (
                <Link key={o.id} to={`/track/${o.orderNumber}`} className="card block p-4 hover:border-brand-taupe/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{o.orderNumber}</span>
                    <span className="font-heading font-bold">{fmt(Number(o.grandTotal))}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-secondary">
                    <StatusBadge status={o.status} />
                    <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                    <span>• {o.paymentMethod}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SecurityView({ user, onBack, refetchMe }: { user: any; onBack: () => void; refetchMe: () => void }) {
  const toast = useToast()
  const [setupData, setSetupData] = useState<any>(null)
  const [code, setCode] = useState('')
  const [disableForm, setDisableForm] = useState({ password: '', code: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const startSetup = async () => {
    setErr(''); setBusy(true)
    try { setSetupData(await api.auth.twoFactor.setup()) }
    catch (e: any) { setErr(e?.data?.error?.message || e?.message || 'Could not start setup') }
    finally { setBusy(false) }
  }
  const confirm = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await api.auth.twoFactor.confirm(code.replace(/\s+/g, '')); setSetupData(null); setCode(''); refetchMe(); toast('Two-factor authentication enabled') }
    catch (ex: any) { setErr(ex?.data?.error?.message || ex?.message || 'Could not confirm') }
    finally { setBusy(false) }
  }
  const disable = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setBusy(true)
    try { await api.auth.twoFactor.disable({ password: disableForm.password, code: disableForm.code || undefined }); setDisableForm({ password: '', code: '' }); refetchMe(); toast('Two-factor authentication disabled') }
    catch (ex: any) { setErr(ex?.data?.error?.message || ex?.message || 'Could not disable') }
    finally { setBusy(false) }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={onBack} className="mb-4 text-sm font-semibold text-brand-taupe hover:underline">← Back to account</button>
      <h1 className="mb-2 font-heading text-xl font-bold">Two-Factor Authentication</h1>
      <div className="card mb-4 flex items-start gap-3 p-4">
        {user.twoFactorEnabled ? <ShieldCheck size={22} className="shrink-0 text-success" /> : <ShieldAlert size={22} className="shrink-0 text-warning" />}
        <div className="text-sm">
          <span className="font-semibold">{user.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</span>
          <p className="text-ink-secondary">{user.twoFactorEnabled ? 'Sign-in requires your password plus a code from your authenticator app (Google Authenticator, Authy, 1Password, etc.).' : 'Scan the QR code below with your authenticator app, then enter the 6-digit code to turn this on.'}</p>
        </div>
      </div>

      {!user.twoFactorEnabled && !setupData && (
        <button className="btn-primary w-full" disabled={busy} onClick={startSetup}>{busy ? 'Preparing…' : 'Enable Two-Factor Authentication'}</button>
      )}

      {!user.twoFactorEnabled && setupData && (
        <div className="card space-y-4 p-5">
          <p className="text-sm text-brand-charcoal/80">1. Scan this QR code with your authenticator app:</p>
          {setupData.qrCodeDataUrl && <img src={setupData.qrCodeDataUrl} alt="Authenticator setup QR code" className="mx-auto h-44 w-44 rounded-md border border-brand-border" />}
          <div>
            <label htmlFor="totp-secret" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-secondary">Or enter this key manually</label>
            <code id="totp-secret" className="block break-all rounded-md bg-brand-ivory px-3 py-2 text-sm">{setupData.secret}</code>
          </div>
          <form onSubmit={confirm} className="space-y-3">
            <p className="text-sm text-brand-charcoal/80">2. Enter the 6-digit code shown by the app:</p>
            <input id="totp-confirm" className="input text-center text-lg tracking-[0.3em]" inputMode="numeric" autoComplete="one-time-code" placeholder="123456"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
            {err && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{err}</div>}
            <div className="flex gap-2">
              <button type="button" className="btn-secondary flex-1" onClick={() => setSetupData(null)}>Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Confirm & Enable'}</button>
            </div>
          </form>
        </div>
      )}

      {user.twoFactorEnabled && (
        <form onSubmit={disable} className="card space-y-3 p-5">
          <p className="text-sm text-brand-charcoal/80">To turn off two-factor authentication, re-enter your password and (if you have it) your current authenticator code.</p>
          <input className="input" type="password" autoComplete="current-password" placeholder="Current password" value={disableForm.password} onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })} required />
          <input className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="Authenticator code (optional)" value={disableForm.code} onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} />
          {err && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{err}</div>}
          <button className="btn-secondary w-full" disabled={busy} type="submit">{busy ? 'Saving…' : 'Disable Two-Factor Authentication'}</button>
        </form>
      )}
      {!user.twoFactorEnabled && err && !setupData && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{err}</div>}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import { Field, Input } from '@/components/ui'
import { TwoFactorStep } from '@/components/TwoFactorStep'

export function AdminLoginPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const res = await api.auth.login(form)
      if (res?.requires2fa && res?.tempToken) { setTempToken(res.tempToken); return }
      if (res.user?.role === 'CUSTOMER') setErr('Admin/staff account required.')
      else nav('/admin')
    } catch (ex: any) { setErr(ex?.data?.error?.message || ex?.message || 'Login failed') }
    finally { setLoading(false) }
  }

  if (tempToken) return <TwoFactorStep tempToken={tempToken} onSuccess={() => nav('/admin')} onBack={() => setTempToken(null)} />

  return (
    <div className="card p-6">
      <h1 className="mb-1 font-heading text-2xl font-bold">Admin sign in</h1>
      <p className="mb-6 text-sm text-brand-charcoal/70">Restricted access. Permissions are enforced server-side. Staff accounts can enable two-factor authentication in their account settings.</p>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="admin-email"><Input id="admin-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></Field>
        <Field label="Password" htmlFor="admin-password"><Input id="admin-password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required /></Field>
        {err && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{err}</div>}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '@/services/api'
import { Field, Input } from '@/components/ui'
import { TwoFactorStep } from '@/components/TwoFactorStep'

export function LoginPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const res = await api.auth.login(form)
      if (res?.requires2fa && res?.tempToken) setTempToken(res.tempToken)
      else nav('/account')
    }
    catch (ex: any) { setErr(ex?.data?.error?.message || ex?.message || 'Login failed') }
    finally { setLoading(false) }
  }

  if (tempToken) return <TwoFactorStep tempToken={tempToken} onSuccess={() => nav('/account')} onBack={() => setTempToken(null)} />

  return (
    <div className="card p-6">
      <h1 className="mb-1 font-heading text-2xl font-bold">Sign in</h1>
      <p className="mb-6 text-sm text-brand-charcoal/70">Access your orders and wishlist.</p>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field label="Email" htmlFor="login-email"><Input id="login-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></Field>
        <Field label="Password" htmlFor="login-password"><Input id="login-password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required /></Field>
        {err && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{err}</div>}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <p className="mt-4 text-sm">New here? <Link to="/register" className="font-semibold text-brand-taupe hover:underline">Create an account</Link></p>
      <p className="mt-2 text-xs text-ink-secondary">Checking out as a guest? Just add shoes to your bag and enter your email at checkout — no account needed.</p>
    </div>
  )
}

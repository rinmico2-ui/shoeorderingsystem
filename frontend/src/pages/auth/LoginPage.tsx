import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/services/api'
import { Field, Input } from '@/components/ui'
import { TwoFactorStep } from '@/components/TwoFactorStep'

export function LoginPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const qc = useQueryClient()
  const [form, setForm] = useState({ email: '', password: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [tempToken, setTempToken] = useState<string | null>(null)

  const onAuthed = async (res: any) => {
    if (res?.user) {
      // Seed the ['me'] cache immediately so /account shows the profile
      // without waiting on a refetch that can be skipped when a stale
      // "guest" (401) query entry is still cached.
      await qc.setQueryData(['me'], res)
      qc.invalidateQueries({ queryKey: ['me'] })
    }
    const next = params.get('next')
    nav(next && next.startsWith('/') && !next.startsWith('//') ? next : '/account')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const res = await api.auth.login(form)
      if (res?.requires2fa && res?.tempToken) setTempToken(res.tempToken)
      else await onAuthed(res)
    }
    catch (ex: any) { setErr(ex?.data?.error?.message || ex?.message || 'Login failed') }
    finally { setLoading(false) }
  }

  if (tempToken) return <TwoFactorStep tempToken={tempToken} onSuccess={onAuthed} onBack={() => setTempToken(null)} />

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
      <p className="mt-2 text-xs text-ink-secondary">An account is required to add shoes to your bag and check out.</p>
    </div>
  )
}

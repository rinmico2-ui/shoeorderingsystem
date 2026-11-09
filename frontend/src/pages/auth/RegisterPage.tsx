import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '@/services/api'
import { Field, Input } from '@/components/ui'

export function RegisterPage() {
  const nav = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await api.auth.register(form); nav('/account') }
    catch (ex: any) { setErr(ex?.data?.error?.message || ex?.message || 'Registration failed') }
    finally { setLoading(false) }
  }
  return (
    <div className="card p-6">
      <h1 className="mb-1 font-heading text-2xl font-bold">Create account</h1>
      <p className="mb-6 text-sm text-brand-charcoal/70">Save your details and track orders.</p>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field label="Full name" htmlFor="reg-name"><Input id="reg-name" autoComplete="name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required /></Field>
        <Field label="Email" htmlFor="reg-email"><Input id="reg-email" type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required /></Field>
        <Field label="Phone (optional)" htmlFor="reg-phone"><Input id="reg-phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
        <Field label="Password (min 8 characters)" htmlFor="reg-password"><Input id="reg-password" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required /></Field>
        {err && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{err}</div>}
        <button className="btn-primary w-full" type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create account'}</button>
      </form>
      <p className="mt-4 text-sm">Already have an account? <Link to="/login" className="font-semibold text-brand-taupe hover:underline">Sign in</Link></p>
    </div>
  )
}

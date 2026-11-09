import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { api } from '@/services/api'
import { Field, Input } from './ui'

export function TwoFactorStep({ tempToken, onSuccess, onBack }: { tempToken: string; onSuccess: () => void; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(''); setLoading(true)
    try {
      await api.auth.twoFactor.verify({ tempToken, code: code.replace(/\s+/g, '') })
      onSuccess()
    } catch (ex: any) {
      setErr(ex?.data?.error?.message || ex?.message || 'Verification failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="card p-6">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-ivory text-brand-taupe"><ShieldCheck size={22} /></span>
      <h1 className="mb-1 font-heading text-2xl font-bold">Two-factor verification</h1>
      <p className="mb-6 text-sm text-brand-charcoal/70">Enter the 6-digit code from your authenticator app to finish signing in. This extra step keeps your account safe.</p>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <Field label="Authenticator code" htmlFor="totp-code">
          <Input id="totp-code" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="123456"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
        </Field>
        {err && <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-error">{err}</div>}
        <button className="btn-primary w-full" type="submit" disabled={loading || code.length !== 6}>{loading ? 'Verifying…' : 'Verify & Sign In'}</button>
      </form>
      <button type="button" onClick={onBack} className="btn-ghost mt-2 w-full">Back to sign in</button>
    </div>
  )
}

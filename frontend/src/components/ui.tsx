import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { forwardRef } from 'react'
import { cn } from '@/utils/cn'

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }) {
  return <button className={cn(variant === 'primary' && 'btn-primary', variant === 'secondary' && 'btn-secondary', variant === 'ghost' && 'btn-ghost', className)} {...props} />
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn('input', className)} {...props} />
})

export function Field({ label, error, children, htmlFor }: { label: string; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm">
      <span className="mb-1 block font-medium text-brand-charcoal">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-error">{error}</span>}
    </label>
  )
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full bg-brand-charcoal px-2 py-0.5 text-[11px] font-semibold text-white', className)}>{children}</span>
}

export function StatusBadge({ status }: { status: string }) {
  const s = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    DELIVERED: 'bg-emerald-50 text-success border-emerald-200',
    COMPLETED: 'bg-emerald-50 text-success border-emerald-200',
    SHIPPED: 'bg-blue-50 text-blue-700 border-blue-200',
    PROCESSING: 'bg-amber-50 text-warning border-amber-200',
    PENDING: 'bg-amber-50 text-warning border-amber-200',
    AWAITING_PAYMENT: 'bg-amber-50 text-warning border-amber-200',
    PAYMENT_VERIFIED: 'bg-emerald-50 text-success border-emerald-200',
    READY_TO_SHIP: 'bg-blue-50 text-blue-700 border-blue-200',
    OUT_FOR_DELIVERY: 'bg-blue-50 text-blue-700 border-blue-200',
    CANCELLED: 'bg-red-50 text-error border-red-200',
    REFUNDED: 'bg-red-50 text-error border-red-200',
  }
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', map[s] || 'bg-brand-gray text-ink-secondary border-brand-border')}>{status}</span>
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton rounded-sm', className)} />
}

export function ProductCardSkeleton() {
  return (
    <div className="card overflow-hidden p-3">
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="mt-3 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-2 h-4 w-1/3" />
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-ivory text-brand-taupe">{icon}</div>
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-secondary">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function QuantityStepper({ value, onChange, min = 1, max, disabled }: { value: number; onChange: (n: number) => void; min?: number; max?: number; disabled?: boolean }) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(max ? Math.min(max, value + 1) : value + 1)
  return (
    <div className="inline-flex items-center rounded-md border border-brand-border" role="group" aria-label="Quantity">
      <button type="button" aria-label="Decrease quantity" disabled={disabled || value <= min} onClick={dec} className="touch-target flex items-center justify-center px-3 disabled:opacity-40">−</button>
      <span aria-live="polite" className="min-w-[2rem] text-center text-sm font-semibold">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={disabled || (max !== undefined && value >= max)} onClick={inc} className="touch-target flex items-center justify-center px-3 disabled:opacity-40">+</button>
    </div>
  )
}

export function RatingStars({ rating, count }: { rating?: number | null; count?: number }) {
  if (rating == null) return <span className="text-xs text-ink-secondary">No ratings yet</span>
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span aria-hidden className="text-amber-500">{'★★★★★'.slice(0, Math.round(rating))}<span className="text-brand-border">{'★★★★★'.slice(Math.round(rating))}</span></span>
      <span className="font-semibold">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-ink-secondary">({count})</span>}
    </span>
  )
}

export function PriceTag({ price, compareAt, className }: { price: unknown; compareAt?: unknown; className?: string }) {
  const p = Number(price)
  const c = compareAt ? Number(compareAt) : null
  const pct = c && c > p ? Math.round(((c - p) / c) * 100) : null
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className="font-heading text-base font-bold text-brand-charcoal">₱{p.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
      {c && pct ? <span className="text-xs text-ink-secondary line-through">₱{c.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span> : null}
      {pct ? <Badge className="bg-error">−{pct}%</Badge> : null}
    </span>
  )
}

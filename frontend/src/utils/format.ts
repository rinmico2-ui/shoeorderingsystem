export const fmt = (n: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(n) || 0)

export function discountPct(price: unknown, compareAt: unknown): number | null {
  const p = Number(price); const c = Number(compareAt)
  if (!p || !c || c <= p) return null
  return Math.round(((c - p) / c) * 100)
}

export function stockOf(variant: any): number {
  if (!variant?.inventory) return 0
  return (variant.inventory.quantityOnHand ?? 0) - (variant.inventory.quantityReserved ?? 0)
}

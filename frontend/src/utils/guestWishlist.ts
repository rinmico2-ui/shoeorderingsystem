// Device-local wishlist for guests (logged-out shoppers).
// Stored snapshots let the wishlist page render without an account;
// on sign-in these are synced to the server wishlist and cleared here.
import type { Product } from '@/types/product'

const KEY = 'kc_guest_wishlist'

export interface GuestWishItem {
  productId: string
  slug: string
  name: string
  basePrice: number
  image?: string
}

export function getGuestWishlist(): GuestWishItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function saveGuestWishlist(items: GuestWishItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)) } catch {}
}

export function isGuestWishlisted(productId: string): boolean {
  return getGuestWishlist().some((i) => i.productId === productId)
}

export function toggleGuestWishlist(product: Product): boolean {
  let items = getGuestWishlist()
  if (items.some((i) => i.productId === product.id)) {
    items = items.filter((i) => i.productId !== product.id)
    saveGuestWishlist(items)
    return false
  }
  items = [...items, { productId: product.id, slug: product.slug, name: product.name, basePrice: Number(product.basePrice), image: product.images?.[0]?.url }]
  saveGuestWishlist(items)
  return true
}

export function clearGuestWishlist() {
  try { localStorage.removeItem(KEY) } catch {}
}

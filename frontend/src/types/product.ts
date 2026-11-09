export interface ProductImage { id?: string; url: string; alt?: string; sortOrder?: number }
export interface ProductVariant {
  id: string; sku?: string; price?: number | string; isActive?: boolean
  size?: { id?: string; label: string }; color?: { id?: string; name: string; hex?: string | null }
  inventory?: { quantityOnHand?: number; quantityReserved?: number; lowStockThreshold?: number | null } | null
  product?: Product
}
export interface Product {
  id: string; name: string; slug: string; description?: string; specifications?: unknown
  basePrice: number | string; compareAtPrice?: number | string | null
  category?: { id?: string; name: string; slug?: string } | null
  brand?: { id?: string; name: string } | null
  images?: ProductImage[]; variants?: ProductVariant[]
  reviews?: { id: string; rating: number; comment?: string | null; isVerifiedPurchase?: boolean; user?: { fullName?: string }; createdAt?: string }[]
  rating?: number | null; reviewCount?: number; availableSizes?: string[]
  isFeatured?: boolean; createdAt?: string
}
export interface CartItem {
  id: string; variantId: string; quantity: number
  variant?: ProductVariant & { product?: Product }
}

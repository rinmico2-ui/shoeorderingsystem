import type { Request, Response } from 'express'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'

export async function listProducts(req: Request, res: Response) {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))
  const search = String(req.query.search || '').trim()
  const category = req.query.category as string | undefined
  const sort = String(req.query.sort || 'recommended')
  const availableOnly = String(req.query.available || '') === '1'
  const minPrice = req.query.minPrice !== undefined && req.query.minPrice !== '' ? Number(req.query.minPrice) : undefined
  const maxPrice = req.query.maxPrice !== undefined && req.query.maxPrice !== '' ? Number(req.query.maxPrice) : undefined
  const where: any = { isPublished: true, isArchived: false, deletedAt: null }
  if (search) where.OR = [{ name: { contains: search } }, { description: { contains: search } }]
  if (category) where.category = { slug: category }
  if ((minPrice !== undefined && Number.isFinite(minPrice)) || (maxPrice !== undefined && Number.isFinite(maxPrice))) {
    where.basePrice = {}
    if (minPrice !== undefined && Number.isFinite(minPrice)) where.basePrice.gte = minPrice
    if (maxPrice !== undefined && Number.isFinite(maxPrice)) where.basePrice.lte = maxPrice
  }
  if (availableOnly) where.variants = { some: { isActive: true, inventory: { quantityOnHand: { gt: 0 } } } }
  const orderBy = sort === 'newest' ? { createdAt: 'desc' } : sort === 'price_asc' ? { basePrice: 'asc' } : sort === 'price_desc' ? { basePrice: 'desc' } : [{ isFeatured: 'desc' }, { createdAt: 'desc' }]
  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy: orderBy as any, skip: (page - 1) * limit, take: limit, include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' }, take: 1 }, variants: { where: { isActive: true }, include: { size: true, color: true, inventory: true } }, reviews: { where: { isApproved: true }, select: { rating: true } } } }),
    prisma.product.count({ where }),
  ])
  const data = items.map((p) => ({ ...p, rating: p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : null, reviewCount: p.reviews.length, availableSizes: [...new Set(p.variants.filter(v => (v.inventory?.quantityOnHand ?? 0) - (v.inventory?.quantityReserved ?? 0) > 0).map(v => v.size.label))] }))
  res.json({ data, meta: { page, limit, total, pages: Math.ceil(total / limit) } })
}

export async function getProduct(req: Request, res: Response) {
  const product = await prisma.product.findFirst({ where: { OR: [{ id: String(req.params.id) }, { slug: String(req.params.id) }], deletedAt: null }, include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' } }, variants: { where: { isActive: true }, include: { size: true, color: true, inventory: true } }, reviews: { where: { isApproved: true }, include: { user: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 20 } } })
  if (!product || (!product.isPublished && req.user?.role === undefined)) throw new AppError(404, 'Product not found', 'NOT_FOUND')
  const rating = product.reviews.length ? product.reviews.reduce((a, r) => a + r.rating, 0) / product.reviews.length : null
  res.json({ data: { ...product, rating } })
}
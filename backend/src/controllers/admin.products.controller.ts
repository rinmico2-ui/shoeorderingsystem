import type { Request, Response } from 'express'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export async function adminListProducts(_req: Request, res: Response) {
  const data = await prisma.product.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, include: { category: true, brand: true, variants: { include: { inventory: true, size: true, color: true } }, _count: { select: { reviews: true } } }, take: 200 })
  res.json({ data })
}
export async function adminCreateProduct(req: Request, res: Response) {
  const b = req.body || {}
  if (!b.name || !b.categoryId || b.basePrice == null) throw new AppError(400, 'name, categoryId, basePrice required', 'VALIDATION_ERROR')
  const slug = b.slug ? slugify(b.slug) : slugify(b.name + '-' + Date.now().toString(36))
  const imgs = Array.isArray(b.images) ? b.images.map((u: string, i: number) => ({ url: u, sortOrder: i })) : []
  const product = await prisma.product.create({
    data: { name: b.name, slug, description: b.description || '', specifications: b.specifications ?? undefined, categoryId: b.categoryId, brandId: b.brandId || null, basePrice: b.basePrice, compareAtPrice: b.compareAtPrice || null, isPublished: !!b.isPublished, isFeatured: !!b.isFeatured, ...(imgs.length ? { images: { create: imgs } } : {}) } as any,
    include: { category: true, brand: true, images: true },
  })
  res.status(201).json({ data: product })
}
export async function adminUpdateProduct(req: Request, res: Response) {
  const id = String(req.params.id); const b = req.body || {}
  const data: any = {}
  for (const k of ['name','description','specifications','categoryId','brandId','basePrice','compareAtPrice','isPublished','isFeatured','isArchived']) if (b[k] !== undefined) data[k] = b[k]
  if (b.slug) data.slug = slugify(b.slug)
  const replaceImages = Array.isArray(b.images)
  const imgs = replaceImages ? b.images.map((u: string, i: number) => ({ url: String(u).trim(), sortOrder: i })).filter((x: any) => x.url) : []
  const updated = await prisma.$transaction(async (tx) => {
    if (replaceImages) {
      await tx.productImage.deleteMany({ where: { productId: id } })
      if (imgs.length) await tx.productImage.createMany({ data: imgs.map((x: any) => ({ ...x, productId: id })) })
    }
    return tx.product.update({ where: { id }, data, include: { category: true, brand: true, images: { orderBy: { sortOrder: 'asc' } }, variants: true } })
  })
  res.json({ data: updated })
}
export async function adminArchiveProduct(req: Request, res: Response) {
  const id = String(req.params.id)
  const inOrders = await prisma.orderItem.count({ where: { variant: { productId: id } } })
  if (inOrders > 0) { await prisma.product.update({ where: { id }, data: { isArchived: true, isPublished: false } }); return res.json({ data: { archived: true, reason: 'Referenced by orders; archived instead of deleted.' } }) }
  await prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isPublished: false } })
  res.json({ data: { deleted: true } })
}
export async function adminUpsertVariant(req: Request, res: Response) {
  const b = req.body || {}; const { productId, sizeId, colorId, sku, price, quantityOnHand } = b
  if (!productId || !sizeId || !colorId || !sku) throw new AppError(400, 'productId, sizeId, colorId, sku required', 'VALIDATION_ERROR')
  const result = await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.upsert({ where: { sku }, update: { price: price ?? null, isActive: b.isActive !== false }, create: { productId, sizeId, colorId, sku, price: price ?? null, isActive: b.isActive !== false } })
    if (quantityOnHand != null) {
      const inv = await tx.inventory.upsert({ where: { variantId: variant.id }, update: {}, create: { variantId: variant.id, quantityOnHand: 0 } })
      const prev = inv.quantityOnHand; const next = Number(quantityOnHand)
      if (next < 0) throw new AppError(400, 'Negative stock not allowed', 'VALIDATION_ERROR')
      await tx.inventory.update({ where: { id: inv.id }, data: { quantityOnHand: next } })
      if (next !== prev) await tx.inventoryMovement.create({ data: { variantId: variant.id, type: 'ADJUSTMENT', quantityDelta: next - prev, previousOnHand: prev, newOnHand: next, previousReserved: inv.quantityReserved, newReserved: inv.quantityReserved, reason: 'Admin set quantity', referenceType: 'ADMIN', actorId: req.user?.id } })
    }
    return tx.productVariant.findUnique({ where: { id: variant.id }, include: { inventory: true, size: true, color: true } })
  })
  res.status(201).json({ data: result })
}
import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, optionalAuth } from '../middlewares/auth.js'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'

export const cartRouter = Router()

// Bag requires sign-in: resolve only a signed-in user's own cart.
async function resolveCart(req: any) {
  if (req.user) {
    return prisma.cart.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id }, include: { items: { include: { variant: { include: { product: { include: { images: { take: 1 } } }, size: true, color: true, inventory: true } } } } } })
  }
  const token = req.cookies?.kc_cart || req.headers['x-cart-token']
  if (!token) return null
  return prisma.cart.findUnique({ where: { guestToken: String(token) }, include: { items: { include: { variant: { include: { product: { include: { images: { take: 1 } } }, size: true, color: true, inventory: true } } } } } })
}

cartRouter.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const cart = await resolveCart(req)
  res.json({ data: cart || { items: [] } })
}))

// Adding/changing shoes in the bag requires an authenticated customer.
cartRouter.post('/items', authenticate, asyncHandler(async (req, res) => {
  const { variantId, quantity } = req.body || {}
  const qty = Math.max(1, Number(quantity) || 1)
  if (!variantId) throw new AppError(400, 'variantId required', 'VALIDATION_ERROR')
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, include: { inventory: true, product: true } })
  if (!variant || !variant.isActive || variant.product.isArchived) throw new AppError(400, 'Variant unavailable', 'UNAVAILABLE')
  const available = (variant.inventory?.quantityOnHand ?? 0) - (variant.inventory?.quantityReserved ?? 0)
  if (qty > available) throw new AppError(400, 'Insufficient stock', 'OUT_OF_STOCK')
  let cart = await resolveCart(req)
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId: req.user!.id } }) as any
  }
  await prisma.cartItem.upsert({ where: { cartId_variantId: { cartId: cart!.id, variantId: String(variantId) } }, update: { quantity: { increment: qty } }, create: { cartId: cart!.id, variantId, quantity: qty } })
  const updated = await prisma.cart.findUnique({ where: { id: cart!.id }, include: { items: { include: { variant: { include: { product: { include: { images: { take: 1 } } }, size: true, color: true, inventory: true } } } } } })
  res.status(201).json({ data: updated })
}))

cartRouter.put('/items/:id', authenticate, asyncHandler(async (req, res) => {
  const qty = Number(req.body?.quantity)
  if (!Number.isFinite(qty) || qty < 1) throw new AppError(400, 'Invalid quantity', 'VALIDATION_ERROR')
  const item = await prisma.cartItem.findUnique({ where: { id: String(req.params.id) }, include: { variant: { include: { inventory: true } }, cart: true } })
  if (!item || item.cart.userId !== req.user!.id) throw new AppError(404, 'Item not found', 'NOT_FOUND')
  const available = (item.variant.inventory?.quantityOnHand ?? 0) - (item.variant.inventory?.quantityReserved ?? 0)
  if (qty > available) throw new AppError(400, 'Insufficient stock', 'OUT_OF_STOCK')
  await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: qty } })
  res.json({ ok: true })
}))

cartRouter.delete('/items/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await prisma.cartItem.findUnique({ where: { id: String(req.params.id) }, include: { cart: true } })
  if (item && item.cart.userId === req.user!.id) await prisma.cartItem.delete({ where: { id: item.id } })
  res.json({ ok: true })
}))
import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'
export const wishlistRouter = Router()
wishlistRouter.get('/', authenticate, asyncHandler(async (req, res) => {
  const wl = await prisma.wishlist.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id }, include: { items: { include: { product: { include: { images: { take: 1 }, variants: { include: { inventory: true, size: true } } } } } } } })
  res.json({ data: wl })
}))
wishlistRouter.post('/items', authenticate, asyncHandler(async (req, res) => {
  const { productId } = req.body || {}
  if (!productId) throw new AppError(400, 'productId required', 'VALIDATION_ERROR')
  const wl = await prisma.wishlist.upsert({ where: { userId: req.user!.id }, update: {}, create: { userId: req.user!.id } })
  await prisma.wishlistItem.upsert({ where: { wishlistId_productId: { wishlistId: wl.id, productId } }, update: {}, create: { wishlistId: wl.id, productId } })
  res.status(201).json({ ok: true })
}))
wishlistRouter.delete('/items/:id', authenticate, asyncHandler(async (req, res) => {
  await prisma.wishlistItem.delete({ where: { id: String(req.params.id) } }).catch(() => null)
  res.json({ ok: true })
}))
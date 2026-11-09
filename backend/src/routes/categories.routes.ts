import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { prisma } from '../config/prisma.js'
export const categoriesRouter = Router()
categoriesRouter.get('/', asyncHandler(async (_req, res) => {
  const data = await prisma.productCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, include: { _count: { select: { products: true } } } })
  res.json({ data })
}))
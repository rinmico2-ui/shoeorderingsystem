import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, optionalAuth, requireRole } from '../middlewares/auth.js'
import * as c from '../controllers/orders.controller.js'
export const ordersRouter = Router()
ordersRouter.post('/', optionalAuth, asyncHandler(c.createOrder))
ordersRouter.post('/lookup', asyncHandler(c.lookupGuestOrders))
ordersRouter.get('/my', authenticate, asyncHandler(c.myOrders))
ordersRouter.get('/track/:orderNumber', asyncHandler(c.trackOrder))
ordersRouter.get('/:id', authenticate, asyncHandler(c.getOrder))
ordersRouter.get('/', authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER','ORDER_STAFF'), asyncHandler(async (_req, res) => { const { prisma } = await import('../config/prisma.js'); const data = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: { select: { fullName: true, email: true } }, payment: true, shipment: true } }); res.json({ data }) }))
import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { prisma } from '../config/prisma.js'
import * as prod from '../controllers/admin.products.controller.js'
import * as cat from '../controllers/admin.catalog.controller.js'
import * as ord from '../controllers/admin.orders.controller.js'
import * as misc from '../controllers/admin.misc.controller.js'

export const adminRouter = Router()
const auth = [authenticate]
const staff = [authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER','INVENTORY_STAFF','ORDER_STAFF')]
const manager = [authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER')]
const inv = [authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER','INVENTORY_STAFF')]
const ordStaff = [authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER','ORDER_STAFF')]

adminRouter.get('/dashboard', ...staff, asyncHandler(async (_req, res) => {
  const [orders, products, customers, pending, lowInv, completed, cancelled, revenue, discounts, refunds] = await Promise.all([
    prisma.order.count(), prisma.product.count({ where: { deletedAt: null } }), prisma.user.count({ where: { role: { name: 'CUSTOMER' } } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.inventory.count({ where: { quantityOnHand: { lte: 5 } } }),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
    prisma.order.aggregate({ _sum: { grandTotal: true, subtotal: true, discountTotal: true }, where: { status: { in: ['PROCESSING','READY_TO_SHIP','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','PAYMENT_VERIFIED'] } } }),
    prisma.order.aggregate({ _sum: { discountTotal: true } }),
    prisma.order.aggregate({ _sum: { grandTotal: true }, where: { status: 'REFUNDED' } }),
  ])
  const recentOrders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { user: { select: { fullName: true } } } })
  const byCategory = await prisma.orderItem.groupBy({ by: ['productNameSnapshot'], _sum: { lineTotal: true }, _count: { _all: true }, orderBy: { _sum: { lineTotal: 'desc' } }, take: 5 })
  res.json({ data: { totalRevenue: revenue._sum.grandTotal || 0, grossSales: revenue._sum.subtotal || 0, discounts: revenue._sum.discountTotal || 0, refunds: refunds._sum.grandTotal || 0, netSales: Number(revenue._sum.grandTotal||0), totalOrders: orders, totalProducts: products, totalCustomers: customers, pendingOrders: pending, lowStockProducts: lowInv, completedOrders: completed, cancelledOrders: cancelled, recentOrders, topProducts: byCategory } })
}))

adminRouter.get('/products', ...manager, asyncHandler(prod.adminListProducts))
adminRouter.post('/products', ...manager, asyncHandler(prod.adminCreateProduct))
adminRouter.put('/products/:id', ...manager, asyncHandler(prod.adminUpdateProduct))
adminRouter.delete('/products/:id', ...manager, asyncHandler(prod.adminArchiveProduct))
adminRouter.post('/variants', ...manager, asyncHandler(prod.adminUpsertVariant))

adminRouter.get('/categories', ...manager, asyncHandler(cat.list))
adminRouter.post('/categories', ...manager, asyncHandler(cat.create))
adminRouter.put('/categories/:id', ...manager, asyncHandler(cat.update))
adminRouter.delete('/categories/:id', ...manager, asyncHandler(cat.remove))
adminRouter.get('/brands', ...manager, asyncHandler(cat.listBrands))
adminRouter.post('/brands', ...manager, asyncHandler(cat.createBrand))
adminRouter.get('/sizes', ...staff, asyncHandler(cat.listSizes))
adminRouter.get('/colors', ...staff, asyncHandler(cat.listColors))

adminRouter.get('/inventory', ...inv, asyncHandler(async (_req, res) => {
  const data = await prisma.inventory.findMany({ include: { variant: { include: { product: { select: { name: true } }, size: true, color: true } } }, orderBy: { updatedAt: 'desc' }, take: 300 })
  res.json({ data })
}))
adminRouter.post('/inventory/:variantId/adjust', ...inv, asyncHandler(async (req, res) => {
  const { delta, reason } = req.body || {}; const d = Number(delta)
  if (!Number.isFinite(d) || d === 0) return res.status(400).json({ error: { message: 'delta required' } })
  const result = await prisma.$transaction(async (tx) => {
    let invr = await tx.inventory.findUnique({ where: { variantId: String(req.params.variantId) } })
    if (!invr) invr = await tx.inventory.create({ data: { variantId: String(req.params.variantId), quantityOnHand: 0 } })
    const prev = invr.quantityOnHand; const next = prev + d
    if (next < 0) throw Object.assign(new Error('Negative stock not allowed'), { statusCode: 400 })
    const updated = await tx.inventory.update({ where: { id: invr.id }, data: { quantityOnHand: next } })
    await tx.inventoryMovement.create({ data: { variantId: String(req.params.variantId), type: d > 0 ? 'MANUAL_ADD' : 'MANUAL_DEDUCT', quantityDelta: d, previousOnHand: prev, newOnHand: next, previousReserved: updated.quantityReserved, newReserved: updated.quantityReserved, reason, referenceType: 'MANUAL', actorId: req.user!.id } })
    await tx.auditLog.create({ data: { actorId: req.user!.id, action: 'INVENTORY_ADJUST', entityType: 'Variant', entityId: String(req.params.variantId), metadata: { delta: d, reason, prev, next } } })
    return updated
  })
  res.json({ data: result })
}))

adminRouter.get('/orders', ...ordStaff, asyncHandler(async (_req, res) => { res.json({ data: await prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 300, include: { user: { select: { fullName: true, email: true } }, payment: true, shipment: true } }) }) }))
adminRouter.get('/orders/:id', ...ordStaff, asyncHandler(ord.adminGetOrder))
adminRouter.put('/orders/:id/status', ...ordStaff, asyncHandler(ord.updateStatus))

adminRouter.get('/customers', ...manager, asyncHandler(async (_req, res) => { res.json({ data: await prisma.user.findMany({ where: { role: { name: 'CUSTOMER' } }, orderBy: { createdAt: 'desc' }, take: 300, select: { id: true, fullName: true, email: true, phone: true, isActive: true, createdAt: true, _count: { select: { orders: true } } } }) }) }))
adminRouter.get('/coupons', ...manager, asyncHandler(misc.list))
adminRouter.post('/coupons', ...manager, asyncHandler(misc.upsert))
adminRouter.get('/reviews', ...manager, asyncHandler(misc.listReviews))
adminRouter.put('/reviews/:id', ...manager, asyncHandler(misc.moderateReview))
adminRouter.get('/reports', ...manager, asyncHandler(async (_req, res) => {
  const [byStatus, totals, byPay] = await Promise.all([
    prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.order.aggregate({ _sum: { subtotal: true, discountTotal: true, shippingTotal: true, grandTotal: true } }),
    prisma.order.groupBy({ by: ['paymentMethod'], _count: { _all: true }, _sum: { grandTotal: true } }),
  ])
  res.json({ data: { byStatus, totals, byPaymentMethod: byPay } })
}))
adminRouter.get('/settings', ...manager, asyncHandler(misc.settings))
adminRouter.post('/settings', ...manager, asyncHandler(misc.upsertSetting))
adminRouter.get('/audit-logs', authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER'), asyncHandler(misc.auditLogs))
adminRouter.get('/me/permissions', ...auth, asyncHandler(async (req, res) => res.json({ user: req.user })))
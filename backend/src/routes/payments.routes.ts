import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { optionalAuth, authenticate, requireRole } from '../middlewares/auth.js'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'

export const paymentsRouter = Router()

paymentsRouter.post('/submit-proof', optionalAuth, asyncHandler(async (req, res) => {
  const { orderId, orderNumber, referenceNumber, receiptImageUrl, customerNote } = req.body || {}
  if (!referenceNumber && !receiptImageUrl) throw new AppError(400, 'Provide a reference number and/or receipt image URL', 'VALIDATION_ERROR')
  const order = await prisma.order.findFirst({ where: orderId ? { id: orderId } : { orderNumber }, include: { payment: true } })
  if (!order || !order.payment) throw new AppError(404, 'Order/payment not found', 'NOT_FOUND')
  if (order.payment.method === 'COD') throw new AppError(400, 'COD orders do not require payment proof', 'VALIDATION_ERROR')
  const admin = ['SUPER_ADMIN','STORE_MANAGER','ORDER_STAFF'].includes(req.user?.role || '')
  if (!admin && order.userId && req.user?.id !== order.userId) throw new AppError(403, 'Forbidden', 'FORBIDDEN')
  if (['VERIFIED','PAID','REFUNDED'].includes(order.payment.status)) throw new AppError(400, 'Payment already verified', 'INVALID_STATE')
  await prisma.$transaction([
    prisma.payment.update({ where: { id: order.payment.id }, data: { status: 'SUBMITTED' as any, referenceNumber, receiptImageUrl, customerNote, submittedAt: new Date(), rejectionReason: null } }),
    prisma.order.update({ where: { id: order.id }, data: { paymentStatus: 'SUBMITTED' as any as any, status: (order.status === 'AWAITING_PAYMENT' ? 'PAYMENT_SUBMITTED' : order.status) as any } }),
    prisma.orderStatusHistory.create({ data: { orderId: order.id, toStatus: (order.status === 'AWAITING_PAYMENT' ? 'PAYMENT_SUBMITTED' : order.status) as any, note: 'Customer submitted manual payment proof', actorId: req.user?.id } }),
  ])
  res.json({ ok: true, message: 'Payment proof submitted. Awaiting admin verification.' })
}))

paymentsRouter.post('/verify', authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER','ORDER_STAFF'), asyncHandler(async (req, res) => {
  const { orderId, approve, rejectionReason } = req.body || {}
  if (!orderId) throw new AppError(400, 'orderId required', 'VALIDATION_ERROR')
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { payment: true, items: true } })
    if (!order?.payment) throw new AppError(404, 'Not found', 'NOT_FOUND')
    if (approve === false) {
      await tx.payment.update({ where: { id: order.payment.id }, data: { status: 'FAILED', rejectionReason: rejectionReason || 'Proof rejected' } })
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'FAILED', status: 'AWAITING_PAYMENT' } })
      await tx.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: 'AWAITING_PAYMENT', note: `Payment proof rejected: ${rejectionReason || 'n/a'}`, actorId: req.user?.id } })
      return { verified: false }
    }
    if (['VERIFIED','PAID'].includes(order.payment.status)) return { verified: true, idempotent: true }
    for (const it of order.items) {
      if (!it.variantId) continue
      const inv = await tx.inventory.findUnique({ where: { variantId: it.variantId } })
      if (inv && inv.quantityReserved >= it.quantity) {
        const prevOn = inv.quantityOnHand, prevRes = inv.quantityReserved
        const updated = await tx.inventory.update({ where: { id: inv.id }, data: { quantityReserved: { decrement: it.quantity }, quantityOnHand: { decrement: it.quantity } } })
        await tx.inventoryMovement.create({ data: { variantId: it.variantId, type: 'SALE', quantityDelta: -it.quantity, previousOnHand: prevOn, newOnHand: updated.quantityOnHand, previousReserved: prevRes, newReserved: updated.quantityReserved, reason: 'Manual payment verified', referenceType: 'ORDER', referenceId: orderId, actorId: req.user?.id } })
      }
    }
    await tx.payment.update({ where: { id: order.payment.id }, data: { status: 'VERIFIED' as any, verifiedAt: new Date(), verifiedById: req.user?.id, rejectionReason: null } })
    await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'VERIFIED' as any as any, status: 'PAYMENT_VERIFIED' } })
    await tx.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: 'PAYMENT_VERIFIED', note: 'Manual payment verified by admin', actorId: req.user?.id } })
    await tx.auditLog.create({ data: { actorId: req.user?.id, action: 'PAYMENT_VERIFY', entityType: 'Order', entityId: orderId, metadata: { approved: true } } })
    return { verified: true }
  })
  res.json({ data: result })
}))

paymentsRouter.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const data = await prisma.payment.findUnique({ where: { id: String(req.params.id) } })
  if (!data) throw new AppError(404, 'Not found', 'NOT_FOUND')
  res.json({ data })
}))

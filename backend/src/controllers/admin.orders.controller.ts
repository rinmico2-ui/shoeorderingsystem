import type { Request, Response } from 'express'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'

const transitions: Record<string, string[]> = {
  PENDING: ['PROCESSING','CANCELLED'],
  AWAITING_PAYMENT: ['PAYMENT_SUBMITTED','PAYMENT_VERIFIED','CANCELLED'],
  PAYMENT_SUBMITTED: ['PAYMENT_VERIFIED','AWAITING_PAYMENT','CANCELLED'],
  PAYMENT_VERIFIED: ['PROCESSING','CANCELLED'],
  PROCESSING: ['READY_TO_SHIP','CANCELLED'],
  READY_TO_SHIP: ['SHIPPED','CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY','DELIVERED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['REFUND_REQUESTED'],
  CANCELLED: [],
  REFUND_REQUESTED: ['REFUNDED'],
  REFUNDED: [],
}

export async function updateStatus(req: Request, res: Response) {
  const id = String(req.params.id); const { status, note, trackingNumber, carrier } = req.body || {}
  if (!status || !transitions[status]) throw new AppError(400, 'Invalid status', 'VALIDATION_ERROR')
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true, payment: true } })
    if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND')
    const allowed = transitions[order.status] || []
    if (!allowed.includes(status) && req.user?.role !== 'SUPER_ADMIN') throw new AppError(400, `Cannot move ${order.status} -> ${status}`, 'INVALID_TRANSITION')
    const updated = await tx.order.update({ where: { id }, data: { status, ...(status === 'PAYMENT_VERIFIED' ? { paymentStatus: 'VERIFIED' } : {}), ...(status === 'CANCELLED' ? { paymentStatus: 'CANCELLED' } : {}) } })
    await tx.orderStatusHistory.create({ data: { orderId: id, fromStatus: order.status, toStatus: status, note, actorId: req.user?.id } })
    if (status === 'PAYMENT_VERIFIED' && order.payment && !['VERIFIED','PAID'].includes(order.payment.status)) {
      for (const it of order.items) {
        if (!it.variantId) continue
        const inv = await tx.inventory.findUnique({ where: { variantId: it.variantId } })
        if (inv && inv.quantityReserved >= it.quantity) {
          const prevOn = inv.quantityOnHand, prevRes = inv.quantityReserved
          const updatedInv = await tx.inventory.update({ where: { id: inv.id }, data: { quantityReserved: { decrement: it.quantity }, quantityOnHand: { decrement: it.quantity } } })
          await tx.inventoryMovement.create({ data: { variantId: it.variantId, type: 'SALE', quantityDelta: -it.quantity, previousOnHand: prevOn, newOnHand: updatedInv.quantityOnHand, previousReserved: prevRes, newReserved: updatedInv.quantityReserved, reason: 'Payment verified (status update)', referenceType: 'ORDER', referenceId: id, actorId: req.user?.id } })
        }
      }
      await tx.payment.update({ where: { id: order.payment.id }, data: { status: 'VERIFIED', verifiedAt: new Date(), verifiedById: req.user?.id } })
    }
    if ((status === 'SHIPPED' || trackingNumber) && (trackingNumber || carrier)) {
      await tx.shipment.upsert({ where: { orderId: id }, update: { trackingNumber, carrier, status, shippedAt: status === 'SHIPPED' ? new Date() : undefined }, create: { orderId: id, trackingNumber, carrier, status, shippedAt: status === 'SHIPPED' ? new Date() : undefined } })
    }
    if (status === 'DELIVERED') await tx.shipment.upsert({ where: { orderId: id }, update: { deliveredAt: new Date(), status }, create: { orderId: id, deliveredAt: new Date(), status } })
    if (status === 'CANCELLED' && ['AWAITING_PAYMENT','PAYMENT_SUBMITTED'].includes(order.status)) {
      for (const it of order.items) {
        if (!it.variantId) continue
        const inv = await tx.inventory.findUnique({ where: { variantId: it.variantId } })
        if (inv && inv.quantityReserved >= it.quantity) {
          const prevR = inv.quantityReserved
          const updatedInv = await tx.inventory.update({ where: { id: inv.id }, data: { quantityReserved: { decrement: it.quantity } } })
          await tx.inventoryMovement.create({ data: { variantId: it.variantId, type: 'RESERVATION_RELEASE', quantityDelta: it.quantity, previousOnHand: updatedInv.quantityOnHand, newOnHand: updatedInv.quantityOnHand, previousReserved: prevR, newReserved: updatedInv.quantityReserved, reason: 'Order cancelled', referenceType: 'ORDER', referenceId: id, actorId: req.user?.id } })
        }
      }
    }
    await tx.auditLog.create({ data: { actorId: req.user?.id, action: 'ORDER_STATUS', entityType: 'Order', entityId: id, metadata: { from: order.status, to: status, note } } })
    return updated
  })
  res.json({ data: result })
}

export async function adminGetOrder(req: Request, res: Response) {
  const data = await prisma.order.findUnique({ where: { id: String(req.params.id) }, include: { items: true, payment: true, shipment: true, statusHistory: { orderBy: { createdAt: 'asc' }, include: { actor: { select: { fullName: true } } } }, user: { select: { fullName: true, email: true, phone: true } } } })
  if (!data) throw new AppError(404, 'Order not found', 'NOT_FOUND')
  res.json({ data })
}

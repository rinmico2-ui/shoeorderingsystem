import type { Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'
import { env } from '../config/env.js'

function orderNumber() { return `KC-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}` }

const ENROUTE_STATUSES = ['SHIPPED', 'OUT_FOR_DELIVERY']

function extractLocation(address: any): { lat: number; lng: number } | null {
  const lat = Number(address?.lat)
  const lng = Number(address?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

export async function createOrder(req: Request, res: Response) {
  const { items, shipping, shippingMethod, shippingFee = 0, paymentMethod, couponCode, idempotencyKey, guestEmail } = req.body || {}
  if (!Array.isArray(items) || !items.length) throw new AppError(400, 'No items', 'VALIDATION_ERROR')
  if (!shipping?.fullName || !shipping?.phone || !shipping?.address) throw new AppError(400, 'Shipping required', 'VALIDATION_ERROR')
  const location = extractLocation(shipping.address)
  const hasLocationInput = shipping.address.lat !== undefined || shipping.address.lng !== undefined
  if (hasLocationInput && !location) throw new AppError(400, 'Invalid delivery location coordinates', 'VALIDATION_ERROR')
  if (!['COD','GCASH','BANK_TRANSFER'].includes(paymentMethod)) throw new AppError(400, 'Invalid payment method', 'VALIDATION_ERROR')
  if (idempotencyKey) {
    const existing = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true, payment: true } })
    if (existing) return res.status(200).json({ data: existing, idempotent: true })
  }
  const result = await prisma.$transaction(async (tx) => {
    let subtotal = 0
    const prepared: any[] = []
    for (const it of items) {
      const variant = await tx.productVariant.findUnique({ where: { id: it.variantId }, include: { inventory: true, product: true, size: true, color: true } })
      if (!variant || !variant.isActive || variant.product.isArchived || !variant.product.isPublished) throw new AppError(400, `Variant unavailable: ${it.variantId}`, 'UNAVAILABLE')
      const qty = Math.max(1, Number(it.quantity) || 1)
      const available = (variant.inventory?.quantityOnHand ?? 0) - (variant.inventory?.quantityReserved ?? 0)
      if (qty > available) throw new AppError(400, `Insufficient stock for ${variant.sku}`, 'OUT_OF_STOCK')
      const unitPrice = Number(variant.price ?? variant.product.basePrice)
      subtotal += unitPrice * qty
      prepared.push({ variant, qty, unitPrice })
    }
    let discountTotal = 0; let coupon: any = null
    if (couponCode) {
      coupon = await tx.coupon.findUnique({ where: { code: String(couponCode).toUpperCase() } })
      const now = new Date()
      if (!coupon || !coupon.isActive || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) throw new AppError(400, 'Invalid coupon', 'INVALID_COUPON')
      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new AppError(400, 'Coupon exhausted', 'INVALID_COUPON')
      if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) throw new AppError(400, 'Minimum purchase not met', 'INVALID_COUPON')
      if (req.user && coupon.perCustomerLimit) {
        const used = await tx.couponUsage.count({ where: { couponId: coupon.id, userId: req.user.id } })
        if (used >= coupon.perCustomerLimit) throw new AppError(400, 'Coupon already used', 'INVALID_COUPON')
      }
      discountTotal = coupon.type === 'percent' ? Math.min(subtotal, subtotal * (Number(coupon.value) / 100)) : Math.min(subtotal, Number(coupon.value))
    }
    const ship = Math.max(0, Number(shippingFee) || 0)
    const grandTotal = Math.max(0, subtotal - discountTotal + ship)
    const manual = paymentMethod !== 'COD'
    const reservationExpiresAt = manual ? new Date(Date.now() + env.STOCK_RESERVATION_MINUTES * 60000) : null
    const status = manual ? 'AWAITING_PAYMENT' : 'PENDING'
    const order = await tx.order.create({ data: {
      orderNumber: orderNumber(), userId: req.user?.id, guestEmail: req.user ? null : guestEmail, status, paymentMethod, paymentStatus: 'PENDING',
      subtotal, discountTotal, shippingTotal: ship, grandTotal, couponId: coupon?.id, shippingName: shipping.fullName, shippingPhone: shipping.phone,
      shippingAddress: { ...shipping.address, ...(location ? { lat: location.lat, lng: location.lng } : {}) }, shippingMethod, idempotencyKey, reservationExpiresAt,
      items: { create: prepared.map(p => ({ variantId: p.variant.id, productNameSnapshot: p.variant.product.name, skuSnapshot: p.variant.sku, variantSnapshot: { size: p.variant.size.label, color: p.variant.color.name }, unitPrice: p.unitPrice, quantity: p.qty, lineTotal: p.unitPrice * p.qty })) },
      statusHistory: { create: { toStatus: status, actorId: req.user?.id, note: manual ? 'Order created; awaiting manual payment proof' : 'Order created (COD)' } },
      payment: { create: { provider: 'MANUAL', method: paymentMethod, status: 'PENDING', amount: grandTotal, idempotencyKey: idempotencyKey ? `${idempotencyKey}:pay` : undefined } },
    }, include: { items: true, payment: true } })
    for (const p of prepared) {
      const inv = await tx.inventory.findUnique({ where: { variantId: p.variant.id } })
      if (inv) {
        const prevOn = inv.quantityOnHand, prevRes = inv.quantityReserved
        const data = manual ? { quantityReserved: { increment: p.qty } } : { quantityOnHand: { decrement: p.qty } }
        const updated = await tx.inventory.update({ where: { id: inv.id }, data })
        if (updated.quantityOnHand < 0 || updated.quantityReserved < 0) throw new AppError(400, 'Stock conflict', 'STOCK_CONFLICT')
        await tx.inventoryMovement.create({ data: { variantId: p.variant.id, type: manual ? 'RESERVATION' : 'SALE', quantityDelta: -p.qty, previousOnHand: prevOn, newOnHand: updated.quantityOnHand, previousReserved: prevRes, newReserved: updated.quantityReserved, referenceType: 'ORDER', referenceId: order.id, actorId: req.user?.id } })
      }
    }
    if (coupon) {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
      await tx.couponUsage.create({ data: { couponId: coupon.id, userId: req.user?.id, orderId: order.id } })
    }
    if (req.user) {
      const cart = await tx.cart.findUnique({ where: { userId: req.user.id } })
      if (cart) await tx.cartItem.deleteMany({ where: { cartId: cart.id } })
    } else {
      const token = req.cookies?.kc_cart || req.headers['x-cart-token']
      if (token) {
        const guestCart = await tx.cart.findUnique({ where: { guestToken: String(token) } })
        if (guestCart) await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } })
      }
    }
    return order
  })
  res.status(201).json({ data: result })
}

export async function myOrders(req: Request, res: Response) {
  const data = await prisma.order.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, include: { items: true, payment: true, shipment: true } })
  res.json({ data })
}

export async function getOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { id: String(req.params.id) }, include: { items: true, payment: true, shipment: true, statusHistory: { orderBy: { createdAt: 'asc' } } } })
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND')
  const admin = ['SUPER_ADMIN','STORE_MANAGER','ORDER_STAFF'].includes(req.user?.role || '')
  if (!admin && order.userId !== req.user?.id) throw new AppError(403, 'Forbidden', 'FORBIDDEN')
  res.json({ data: order })
}

export async function lookupGuestOrders(req: Request, res: Response) {
  const { email, phone } = req.body || {}
  const emailNorm = String(email || '').trim().toLowerCase()
  const phoneDigits = String(phone || '').replace(/\D/g, '')
  if (!/^\S+@\S+\.\S+$/.test(emailNorm)) throw new AppError(400, 'Enter a valid email', 'VALIDATION_ERROR')
  if (phoneDigits.length < 4) throw new AppError(400, 'Enter at least the last 4 digits of your order phone number', 'VALIDATION_ERROR')
  const suffix = phoneDigits.slice(-4)
  const data = await prisma.order.findMany({
    where: { guestEmail: emailNorm },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { items: true },
  })
  const matched = data
    .filter((o) => String(o.shippingPhone || '').replace(/\D/g, '').slice(-4) === suffix)
    .map((o) => ({ orderNumber: o.orderNumber, status: o.status, createdAt: o.createdAt, grandTotal: o.grandTotal, items: o.items.map((i) => ({ name: i.productNameSnapshot, qty: i.quantity })) }))
  res.json({ data: matched })
}

export async function trackOrder(req: Request, res: Response) {
  const order = await prisma.order.findUnique({ where: { orderNumber: String(req.params.orderNumber) }, include: { items: true, shipment: true, statusHistory: { orderBy: { createdAt: 'asc' } } } })
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND')
  const isEnroute = ENROUTE_STATUSES.includes(order.status)
  const deliveryLocation = isEnroute ? extractLocation((order as any).shippingAddress) : null
  res.json({ data: { orderNumber: order.orderNumber, status: order.status, isEnroute, deliveryLocation, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus, shipment: order.shipment, statusHistory: order.statusHistory, items: order.items.map(i => ({ name: i.productNameSnapshot, qty: i.quantity })) } })
}

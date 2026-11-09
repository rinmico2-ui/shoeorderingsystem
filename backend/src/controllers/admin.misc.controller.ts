import type { Request, Response } from 'express'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'
export async function list(_req: Request, res: Response) { res.json({ data: await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }) }) }
export async function upsert(req: Request, res: Response) {
  const b = req.body || {}; if (!b.code || !b.type || b.value == null) throw new AppError(400,'code,type,value required','VALIDATION_ERROR')
  const data = { code: String(b.code).toUpperCase(), type: b.type, value: b.value, minPurchase: b.minPurchase ?? null, maxUses: b.maxUses ?? null, perCustomerLimit: b.perCustomerLimit ?? null, startsAt: b.startsAt?new Date(b.startsAt):null, expiresAt: b.expiresAt?new Date(b.expiresAt):null, isActive: b.isActive !== false }
  const coupon = b.id ? await prisma.coupon.update({ where: { id: b.id }, data }) : await prisma.coupon.upsert({ where: { code: data.code }, update: data, create: data })
  res.json({ data: coupon })
}
export async function listReviews(_req: Request, res: Response) { res.json({ data: await prisma.review.findMany({ orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true } }, user: { select: { fullName: true, email: true } } }, take: 200 }) }) }
export async function moderateReview(req: Request, res: Response) {
  const id = String(req.params.id); const { isApproved, adminResponse } = req.body || {}
  res.json({ data: await prisma.review.update({ where: { id }, data: { ...(isApproved!==undefined?{isApproved}:{}), ...(adminResponse!==undefined?{adminResponse}:{}) } }) })
}
export async function settings(_req: Request, res: Response) { res.json({ data: await prisma.storeSetting.findMany() }) }
export async function upsertSetting(req: Request, res: Response) { const { key, value } = req.body||{}; if(!key) throw new AppError(400,'key required','VALIDATION_ERROR'); res.json({ data: await prisma.storeSetting.upsert({ where: { key }, update: { value }, create: { key, value } }) }) }
export async function auditLogs(_req: Request, res: Response) { res.json({ data: await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200, include: { actor: { select: { fullName: true, email: true } } } }) }) }
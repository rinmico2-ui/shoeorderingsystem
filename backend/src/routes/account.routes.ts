import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate } from '../middlewares/auth.js'
import { prisma } from '../config/prisma.js'
import bcrypt from 'bcryptjs'
import { AppError } from '../middlewares/error.js'

export const accountRouter = Router()
accountRouter.use(authenticate)

accountRouter.put('/profile', asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body || {}
  const data = await prisma.user.update({ where: { id: req.user!.id }, data: { ...(fullName?{fullName}:{}), ...(phone!==undefined?{phone}:{}) }, select: { id: true, email: true, fullName: true, phone: true } })
  res.json({ data })
}))
accountRouter.put('/password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword || String(newPassword).length < 8) throw new AppError(400, 'currentPassword and newPassword (>=8) required', 'VALIDATION_ERROR')
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(400, 'Current password incorrect', 'INVALID_CREDENTIALS')
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 12) } })
  res.json({ ok: true })
}))
accountRouter.get('/addresses', asyncHandler(async (req, res) => { res.json({ data: await prisma.userAddress.findMany({ where: { userId: req.user!.id }, orderBy: { isDefault: 'desc' } }) }) }))
accountRouter.post('/addresses', asyncHandler(async (req, res) => {
  const b = req.body || {}; if (!b.fullName||!b.phone||!b.street||!b.city) throw new AppError(400,'Address fields required','VALIDATION_ERROR')
  if (b.isDefault) await prisma.userAddress.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } })
  res.status(201).json({ data: await prisma.userAddress.create({ data: { userId: req.user!.id, label:b.label, fullName:b.fullName, phone:b.phone, region:b.region||'', province:b.province||'', city:b.city, barangay:b.barangay||'', street:b.street, postalCode:b.postalCode||'', instructions:b.instructions, isDefault: !!b.isDefault } }) })
}))
accountRouter.delete('/addresses/:id', asyncHandler(async (req, res) => { await prisma.userAddress.deleteMany({ where: { id: String(req.params.id), userId: req.user!.id } }); res.json({ ok: true }) }))
accountRouter.get('/notifications', asyncHandler(async (req, res) => { res.json({ data: await prisma.notification.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 }) }) }))
accountRouter.put('/notifications/:id/read', asyncHandler(async (req, res) => { await prisma.notification.updateMany({ where: { id: String(req.params.id), userId: req.user!.id }, data: { isRead: true } }); res.json({ ok: true }) }))
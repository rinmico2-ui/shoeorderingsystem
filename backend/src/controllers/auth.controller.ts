import type { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '../config/prisma.js'
import { AppError } from '../middlewares/error.js'
import { clearAuthCookie, setAuthCookie, signToken } from '../middlewares/auth.js'
import { env } from '../config/env.js'

const safeUser = (u: any) => ({ id: u.id, email: u.email, fullName: u.fullName, phone: u.phone, role: u.role?.name ?? u.role, twoFactorEnabled: !!u.twoFactorEnabled })

function totpKey() { return crypto.createHash('sha256').update(env.JWT_SECRET).digest() }
function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', totpKey(), iv)
  const ct = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${ct.toString('base64')}`
}
function decryptSecret(payload: string): string {
  const [ivB, tagB, ctB] = payload.split('.')
  const decipher = crypto.createDecipheriv('aes-256-gcm', totpKey(), Buffer.from(ivB, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(ctB, 'base64')), decipher.final()]).toString('utf8')
}
function verifyTotp(encrypted: string | null, code: unknown): boolean {
  if (!encrypted || typeof code !== 'string') return false
  try { return verifySync({ token: code.replace(/\s+/g, ''), secret: decryptSecret(encrypted) }).valid } catch { return false }
}
function signTempToken(userId: string) {
  return jwt.sign({ sub: userId, purpose: '2fa' }, env.JWT_SECRET, { expiresIn: '10m' })
}

export async function register(req: Request, res: Response) {
  const { fullName, email, password, phone } = req.body
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new AppError(409, 'Email already registered', 'EMAIL_TAKEN')
  const role = await prisma.role.upsert({ where: { name: 'CUSTOMER' }, update: {}, create: { name: 'CUSTOMER', description: 'Customer' } })
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({ data: { fullName, email, passwordHash, phone, roleId: role.id }, include: { role: true } })
  await prisma.cart.create({ data: { userId: user.id } }).catch(() => null)
  await prisma.wishlist.create({ data: { userId: user.id } }).catch(() => null)
  const token = signToken({ id: user.id, email: user.email, role: user.role.name })
  setAuthCookie(res, token)
  res.status(201).json({ user: safeUser(user) })
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email, isActive: true, deletedAt: null }, include: { role: true } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
  if (user.twoFactorEnabled) {
    return res.json({ requires2fa: true, tempToken: signTempToken(user.id), user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role.name, twoFactorEnabled: true } })
  }
  const token = signToken({ id: user.id, email: user.email, role: user.role.name })
  setAuthCookie(res, token)
  res.json({ user: safeUser(user) })
}

export async function logout(_req: Request, res: Response) {
  clearAuthCookie(res)
  res.json({ ok: true })
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { role: true } })
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND')
  res.json({ user: safeUser(user) })
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await prisma.storeSetting.upsert({ where: { key: `pwreset:${user.id}` }, update: { value: { token, expiresAt: Date.now() + 3600000 } }, create: { key: `pwreset:${user.id}`, value: { token, expiresAt: Date.now() + 3600000 } } })
    // Email delivery wired via integration when EMAIL_* configured; token logged only in dev for setup.
    if (process.env.NODE_ENV !== 'production') console.log('Password reset token (dev):', token)
  }
  res.json({ ok: true, message: 'If the email exists, a reset link will be sent.' })
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body
  const settings = await prisma.storeSetting.findMany({ where: { key: { startsWith: 'pwreset:' } } })
  const match = settings.find((s: any) => s.value?.token === token && s.value?.expiresAt > Date.now())
  if (!match) throw new AppError(400, 'Invalid or expired reset token', 'INVALID_TOKEN')
  const userId = match.key.replace('pwreset:', '')
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } })
  await prisma.storeSetting.delete({ where: { key: match.key } })
  res.json({ ok: true })
}

export async function twoFactorSetup(req: Request, res: Response) {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id }, include: { role: true } })
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND')
  if (user.twoFactorEnabled) throw new AppError(400, 'Two-factor authentication is already enabled', 'ALREADY_ENABLED')
  const secret = generateSecret()
  const otpauthUrl = generateURI({ secret, issuer: "Khyleene's Collection", label: user.email })
  await prisma.user.update({ where: { id: user.id }, data: { totpSecretEncrypted: encryptSecret(secret), twoFactorConfirmedAt: null } })
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl)
  res.json({ otpauthUrl, secret, qrCodeDataUrl })
}

export async function twoFactorConfirm(req: Request, res: Response) {
  const { code } = req.body || {}
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user?.totpSecretEncrypted) throw new AppError(400, 'Start setup first', 'SETUP_REQUIRED')
  if (!verifyTotp(user.totpSecretEncrypted, code)) throw new AppError(401, 'Invalid authenticator code', 'INVALID_2FA_CODE')
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true, twoFactorConfirmedAt: new Date() } })
  res.json({ ok: true, twoFactorEnabled: true })
}

export async function twoFactorDisable(req: Request, res: Response) {
  const { password, code } = req.body || {}
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } })
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND')
  if (!user.twoFactorEnabled) throw new AppError(400, 'Two-factor authentication is not enabled', 'NOT_ENABLED')
  if (typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) throw new AppError(401, 'Invalid password', 'INVALID_CREDENTIALS')
  if (code !== undefined && !verifyTotp(user.totpSecretEncrypted, code)) throw new AppError(401, 'Invalid authenticator code', 'INVALID_2FA_CODE')
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, totpSecretEncrypted: null, twoFactorConfirmedAt: null } })
  res.json({ ok: true, twoFactorEnabled: false })
}

export async function twoFactorVerify(req: Request, res: Response) {
  const { tempToken, code } = req.body || {}
  if (typeof tempToken !== 'string' || typeof code !== 'string') throw new AppError(400, 'tempToken and code required', 'VALIDATION_ERROR')
  let payload: { sub: string; purpose?: string }
  try { payload = jwt.verify(tempToken, env.JWT_SECRET) as any } catch { throw new AppError(401, '2FA session expired. Log in again.', '2FA_EXPIRED') }
  if (payload.purpose !== '2fa') throw new AppError(401, 'Invalid 2FA session', 'INVALID_2FA')
  const user = await prisma.user.findUnique({ where: { id: payload.sub, isActive: true, deletedAt: null }, include: { role: true } })
  if (!user || !user.twoFactorEnabled) throw new AppError(401, 'Invalid 2FA session', 'INVALID_2FA')
  if (!verifyTotp(user.totpSecretEncrypted, code)) throw new AppError(401, 'Invalid authenticator code', 'INVALID_2FA_CODE')
  const token = signToken({ id: user.id, email: user.email, role: user.role.name })
  setAuthCookie(res, token)
  res.json({ user: safeUser(user) })
}
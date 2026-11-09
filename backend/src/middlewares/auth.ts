import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { prisma } from '../config/prisma.js'
import { AppError } from './error.js'

export interface AuthUser { id: string; email: string; role: string; permissions: string[] }
declare global { namespace Express { interface Request { user?: AuthUser } } }

const COOKIE = 'kc_token'

export function signToken(user: { id: string; email: string; role: string }) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as any })
}

function isSecureCookie() {
  return env.COOKIE_SECURE === 'true' || env.NODE_ENV === 'production' || String(env.FRONTEND_URL || '').includes('https://')
}

export function setAuthCookie(res: Response, token: string) {
  const secure = isSecureCookie()
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: secure ? 'none' : 'lax', secure, path: '/', maxAge: 86400000 })
}
export function clearAuthCookie(res: Response) {
  const secure = isSecureCookie()
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: secure ? 'none' : 'lax', secure, path: '/' })
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE]
  if (!token) return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED'))
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string }
    const user = await prisma.user.findUnique({ where: { id: payload.sub, isActive: true, deletedAt: null }, include: { role: { include: { permissions: { include: { permission: true } } } } } })
    if (!user) return next(new AppError(401, 'Invalid session', 'UNAUTHORIZED'))
    req.user = { id: user.id, email: user.email, role: user.role.name, permissions: user.role.permissions.map((p: any) => p.permission.key) }
    next()
  } catch { next(new AppError(401, 'Invalid session', 'UNAUTHORIZED')) }
}
export function optionalAuth(req: Request, res: Response, next: NextFunction) { if (!req.cookies?.[COOKIE]) return next(); return authenticate(req, res, next) }
export function requireRole(...roles: string[]) { return (req: Request, _res: Response, next: NextFunction) => { if (!req.user) return next(new AppError(401, 'Authentication required', 'UNAUTHORIZED')); if (req.user.role === 'SUPER_ADMIN' || roles.includes(req.user.role)) return next(); next(new AppError(403, 'Forbidden', 'FORBIDDEN')) } }
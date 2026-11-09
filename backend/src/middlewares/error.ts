import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code = 'APP_ERROR') {
    super(message)
  }
}

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'Not found', 'NOT_FOUND'))
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.flatten() } })
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } })
  }
  console.error(err)
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : (err as Error)?.message || 'Internal server error'
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message } })
}
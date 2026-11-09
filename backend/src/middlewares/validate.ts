import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
export const validate = (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
  const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params })
  if (!parsed.success) return next(parsed.error)
  req.body = (parsed.data as any).body ?? req.body
  next()
}
import { z } from 'zod'
export const registerSchema = z.object({ body: z.object({ fullName: z.string().min(2), email: z.string().email(), password: z.string().min(8), phone: z.string().optional() }) })
export const loginSchema = z.object({ body: z.object({ email: z.string().email(), password: z.string().min(1) }) })
export const forgotSchema = z.object({ body: z.object({ email: z.string().email() }) })
export const resetSchema = z.object({ body: z.object({ token: z.string().min(10), password: z.string().min(8) }) })
export const totpConfirmSchema = z.object({ body: z.object({ code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }) })
export const totpDisableSchema = z.object({ body: z.object({ password: z.string().min(1), code: z.string().regex(/^\d{6}$/).optional() }) })
export const totpVerifySchema = z.object({ body: z.object({ tempToken: z.string().min(20), code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code') }) })
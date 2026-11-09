import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { validate } from '../middlewares/validate.js'
import { authenticate } from '../middlewares/auth.js'
import { forgotSchema, loginSchema, registerSchema, resetSchema, totpConfirmSchema, totpDisableSchema, totpVerifySchema } from '../validators/auth.js'
import * as c from '../controllers/auth.controller.js'

export const authRouter = Router()
authRouter.post('/register', validate(registerSchema), asyncHandler(c.register))
authRouter.post('/login', validate(loginSchema), asyncHandler(c.login))
authRouter.post('/logout', asyncHandler(c.logout))
authRouter.post('/forgot-password', validate(forgotSchema), asyncHandler(c.forgotPassword))
authRouter.post('/reset-password', validate(resetSchema), asyncHandler(c.resetPassword))
authRouter.get('/me', authenticate, asyncHandler(c.me))
authRouter.post('/2fa/setup', authenticate, asyncHandler(c.twoFactorSetup))
authRouter.post('/2fa/confirm', authenticate, validate(totpConfirmSchema), asyncHandler(c.twoFactorConfirm))
authRouter.post('/2fa/disable', authenticate, validate(totpDisableSchema), asyncHandler(c.twoFactorDisable))
authRouter.post('/2fa/verify', validate(totpVerifySchema), asyncHandler(c.twoFactorVerify))
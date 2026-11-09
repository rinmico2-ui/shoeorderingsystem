import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { authenticate, requireRole } from '../middlewares/auth.js'
import { env } from '../config/env.js'
export const uploadsRouter = Router()
uploadsRouter.post('/image', authenticate, requireRole('SUPER_ADMIN','STORE_MANAGER'), asyncHandler(async (req, res) => {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return res.status(501).json({ error: { code: 'INTEGRATION_UNCONFIGURED', message: 'Cloudinary not configured. Set CLOUDINARY_* in backend env. Use direct image URLs for development.' } })
  }
  // Production path: accept multipart via multer, validate mime/size, upload to Cloudinary, return secure URL.
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'Wire multer + cloudinary SDK with this configured environment.' } })
}))
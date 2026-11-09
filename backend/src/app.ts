import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middlewares/error.js'
import { apiRouter } from './routes/index.js'

export const app = express()

app.set('trust proxy', 1)
app.use(helmet())

// CORS: allow credentialed cross-site cookie auth from the storefront.
// FRONTEND_URL may hold multiple origins separated by commas (e.g. the
// Vercel URL + a custom domain); trailing slashes are ignored so a
// value mis-set as "https://shop.example.com/" still matches the Origin
// header (which never carries a trailing slash).
const allowedOrigins = String(env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.length === 0) return cb(null, true)
    cb(null, allowedOrigins.includes(origin.replace(/\/+$/, '')))
  },
  credentials: true,
}))
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/v1', apiRouter)
app.use(notFound)
app.use(errorHandler)
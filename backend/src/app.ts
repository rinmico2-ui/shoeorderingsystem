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
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }))
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api/v1', apiRouter)
app.use(notFound)
app.use(errorHandler)
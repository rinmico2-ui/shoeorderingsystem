import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('1d'),
  COOKIE_SECURE: z.string().default('false'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  STOCK_RESERVATION_MINUTES: z.coerce.number().default(30),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  EMAIL_HOST: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors)
  if (process.env.NODE_ENV === 'production') throw new Error('Invalid environment'); console.warn('Continuing with partial env (dev).')
}

export const env = parsed.success ? parsed.data : (process.env as unknown as z.infer<typeof envSchema>)
export const isProd = env.NODE_ENV === 'production'
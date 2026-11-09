# Live Deployment (Khyleene's Collection)

Stack requires **3 hosted parts**: static frontend, Node/Express API, and MySQL. Auth uses **HTTP-only cookies across domains**, so production needs HTTPS + correct CORS/cookie settings.

## Recommended
| Part | Provider | Notes |
|---|---|---|
| Frontend | Vercel (or Netlify) | root rontend, build 
pm run build, output dist |
| Backend | Render (or Railway) | root ackend, build 
pm install && npm run build, start 
pm run start |
| MySQL | TiDB Cloud / Aiven / Railway MySQL | set DATABASE_URL; run prisma migrate deploy |

## 1) Database — get DATABASE_URL
Put DATABASE_URL in ackend/.env (local migrate) and in the hosted backend env vars. Never commit it.

**TiDB Cloud (MySQL-compatible, port 4000, TLS required):** cluster → Connect → General.
`env
DATABASE_URL="mysql://<USER>.root:<PASSWORD>@<HOST>:4000/<DATABASE>?sslaccept=strict"
`
Create/reset the password in TiDB and URL-encode special characters in the password. Use the exact URI/SSL param TiDB shows if different.

**Local MySQL (dev):** mysql://root:@localhost:3306/khyleenes_collection

Run migrations once (from ackend/, deps installed), pointed at the target DB:
`powershell
npx prisma@6.4.1 migrate deploy
npx prisma@6.4.1 db seed   # optional; use a strong SEED_ADMIN_PASSWORD
`

## 2) Backend (Render/Railway)
- Root ackend, build 
pm install && npm run build, start 
pm run start, health /api/health.
- Env vars (backend only): NODE_ENV=production, DATABASE_URL, JWT_SECRET (32+ chars), FRONTEND_URL=https://<your-frontend-domain> (exact origin), COOKIE_SECURE=true, STOCK_RESERVATION_MINUTES=30, optional CLOUDINARY_*/EMAIL_*/GCASH_*/BANK_*. (PORT is provided by the host.)

Cookies in production: httpOnly; sameSite=none; secure (cross-site). Requires **HTTPS** on both ends.

## 3) Frontend (Vercel)
- Root rontend, build 
pm run build, output dist. SPA rewrite: rontend/vercel.json.
- Env var: VITE_API_URL=https://<your-backend-domain>/api/v1
- After deploy, set backend FRONTEND_URL to the exact frontend origin and redeploy.

## 4) Verify
- https://<backend>/api/health → { "status": "ok" }. Test register/login, COD/manual-payment order, admin login.

## Common issues
- **Session not sticking:** FRONTEND_URL must exactly match frontend origin, COOKIE_SECURE=true, both HTTPS.
- **CORS:** fix FRONTEND_URL.
- **DB/SSL:** use the provider’s DATABASE_URL format/SSL param. TiDB needs port 4000 + TLS.
- **Prod command:** use 
pm run build + 
pm run start (not dev/	sx).

I cannot deploy without your hosting accounts/credentials.

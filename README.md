# Khyleene''s Collection

Enterprise shoe e-commerce platform (Philippines, PHP).

## Stack
- **Frontend:** React + Vite + TypeScript, Tailwind, React Router, TanStack Query, RHF+Zod, Recharts, lucide-react.
- **Backend:** Node.js + Express + TypeScript (REST `/api/v1`), Prisma, Zod, bcrypt, JWT in HTTP-only cookies, Helmet, rate limiting.
- **Database:** MySQL (Prisma, migrations, transactions). Frontend never connects to MySQL.

## Payments (manual — no payment gateway)
- **COD**, **GCash (manual transfer)**, **Bank Transfer**.
- Customer submits **reference number + proof of receipt (image URL)** via `/api/v1/payments/submit-proof`.
- Admin verifies/rejects via `/api/v1/payments/verify` (RBAC, audited). Stock is **reserved** for pending manual payments and **finalized** on verification (transactional, no oversell). Configure store GCash/bank details in admin Store Settings.

## Structure
- `frontend/` storefront + admin UI
- `backend/` API (`routes → middlewares → controllers → services`), `prisma/` schema+seed
- `docs/` architecture, database, API, deployment

## Setup
1. `backend/.env` from `.env.example` (set `DATABASE_URL` MySQL, `JWT_SECRET` >=16, `FRONTEND_URL`, `SEED_ADMIN_*`, optional `GCASH_*`/`BANK_*`).
2. `backend`: `npm install && npx prisma@6.4.1 generate && npx prisma@6.4.1 migrate dev --name init && npx prisma@6.4.1 db seed && npm run dev` (API `/api/health`).
3. `frontend/.env` from `.env.example` (`VITE_API_URL=http://localhost:5000/api/v1`): `npm install && npm run dev`.

## Integrations (backend-only env; never commit secrets)
- Images: Cloudinary (optional; `/uploads/image` is config-gated) or paste image URLs.
- Email: Resend/Nodemailer (optional). All pricing/stock/coupons validated server-side; order/payment idempotent.
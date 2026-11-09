# Architecture (Phase 1)
- Monorepo: React/Vite frontend + Express/Prisma backend + MySQL. REST /api/v1.
- Backend layering: routes -> auth/RBAC/validation middleware -> controllers -> services (business logic, totals, transactions) -> repositories (Prisma/MySQL).
- Auth: hashed passwords (bcrypt/Argon2), JWT in secure HTTP-only cookies, server-enforced RBAC (Super Admin, Store Manager, Inventory Staff, Order Staff, Customer).
- Critical ops: DB transactions for checkout/inventory; server-side price/stock/coupon validation; idempotent order/payment; payment confirmation via trusted webhooks only.
- Integrations (backend-only secrets): Manual payments (COD, GCash, Bank Transfer) with customer proof-of-receipt + admin verification (no gateway). Cloudinary/email optional/config-gated. Never fake confirmations.

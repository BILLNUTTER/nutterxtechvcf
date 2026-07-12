# Nutterx Technologies VCF Registration

A production-ready web application that lets users register their phone number and download the official Nutterx Technologies VCF contact card.

## Run & Operate

- `pnpm --filter @workspace/vcf-registration run dev` — run the frontend (React + Vite)
- `pnpm --filter @workspace/api-server run dev` — run the API server (Express)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only; run after providing DATABASE_URL)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19, Vite, Tailwind CSS v4, TanStack Query, Wouter
- API: Express 5, express-session, helmet, express-rate-limit
- DB: PostgreSQL + Drizzle ORM + drizzle-zod
- Validation: Zod (zod/v4)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (your Supabase URL) |
| `SESSION_SECRET` | ✅ | Secret key for express-session cookie signing |
| `ADMIN_USERNAME` | ✅ | Admin panel login username |
| `ADMIN_PASSWORD` | ✅ | Admin panel login password |

Set these in Replit's Secrets panel. After setting DATABASE_URL, run `pnpm --filter @workspace/db run push` to create the tables.

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/registrations.ts` — registrations table (id, name, phone unique, created_at)
- `lib/db/src/schema/settings.ts` — VCF company settings table
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/routes/admin.ts` — all admin endpoints (auth, registrations, settings)
- `artifacts/api-server/src/routes/register.ts` — public registration endpoint (rate-limited)
- `artifacts/api-server/src/routes/vcf.ts` — VCF file generation and download
- `artifacts/vcf-registration/src/` — React frontend

## Features

- **Registration form** — Full Name + Phone (E.164 format enforced, spaces stripped, unique constraint)
- **VCF download** — Downloads NUTTERX.vcf generated from admin-configurable company settings
- **Admin panel** — `/admin` route, session-based auth, total count, search, delete, export CSV, settings editor
- **Security** — Helmet headers, CORS, rate limiting (10 req/15min on /register), input validation with Zod, parameterized queries via Drizzle ORM

## Architecture decisions

- Session-based auth for admin (not JWT) — simpler, no token refresh complexity for a single-admin use case
- Drizzle ORM prevents SQL injection by design — all queries parameterized
- Settings stored in DB (single row) so VCF content can be updated without redeployment
- `/admin/registrations/export` registered before `/:id` to prevent "export" being matched as an ID param

## User preferences

- DATABASE_URL will be provided by the user (their own Supabase PostgreSQL URL)
- Do NOT create or generate a database URL
- All secrets via environment variables only

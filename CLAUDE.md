# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinTRACK is a self-hosted personal finance and portfolio tracker. INR-only (Indian number formatting: ₹1,23,456). No admin role — every user self-registers and owns their own data.

## Stack

- **API:** NestJS 10, Prisma 5, PostgreSQL 16, JWT auth (argon2id passwords, refresh tokens in httpOnly cookies)
- **Web:** React 18, Vite 5, Tailwind CSS 3, Recharts, React Query v5, Zustand, React Hook Form + Zod
- **Infra:** Docker Compose (one-command local startup), Caddy (production reverse proxy)

## Development Commands

All commands run from within each app directory.

### API (`apps/api/`)
```bash
npm run start:dev        # watch mode (requires DATABASE_URL in env)
npm run build            # tsc via nest build → dist/
npm run prisma:generate  # regenerate Prisma client after schema changes
npm run prisma:migrate   # prisma migrate deploy (production-style)
npm run db:seed          # ts-node prisma/seed.ts
```

### Web (`apps/web/`)
```bash
npm run dev      # Vite dev server on :5173 (proxies /api → localhost:3001)
npm run build    # tsc + vite build → dist/
```

### Full stack (Docker)
```bash
# from repo root
docker-compose up --build -d   # builds & starts db + api + web
docker-compose down             # stop all
docker logs 3fintrack-api-1     # tail API logs
```

The API container runs `prisma migrate deploy && node dist/main` on startup — migrations are automatic.

## Environment Variables

Copy `.env.example` to `.env` at the repo root. Docker Compose reads from it.

| Variable | Used by | Notes |
|---|---|---|
| `DATABASE_URL` | API | Set automatically in Docker via compose |
| `JWT_SECRET` | API | Access token signing |
| `JWT_REFRESH_SECRET` | API | Refresh token strategy |
| `CORS_ORIGIN` | API | Defaults to `http://localhost:5173` |
| `VITE_API_URL` | Web build | Defaults to `''` (relative URLs via Vite proxy in dev) |

## Architecture

### API structure
Every feature follows the same NestJS module pattern:
```
src/<feature>/
  <feature>.module.ts
  <feature>.controller.ts   ← HTTP layer, guards, cookies
  <feature>.service.ts      ← business logic, Prisma calls
  dto/<feature>.dto.ts      ← class-validator DTOs
```

`PrismaService` is a global singleton in `src/common/prisma/`. All routes are prefixed `/api` (set in `main.ts`). The `@CurrentUser()` decorator extracts the JWT payload from the request.

### Auth flow
- **Login/Register** → returns `accessToken` (15 min JWT) in response body + sets `refresh_token` httpOnly cookie (7 days)
- **Token refresh** → `POST /api/auth/refresh` reads the cookie, verifies against hashed token in DB (rotation: old token deleted, new one issued)
- **Frontend** (`src/lib/api.ts`) auto-retries failed requests on 401 using the refresh endpoint; on refresh failure clears auth and redirects to `/login`
- `accessToken` is kept only in Zustand memory (not localStorage). Only `user` object is persisted to localStorage.

### Web structure
- `src/lib/api.ts` — single axios instance with auth interceptors; all API modules in `src/api/` import from it
- `src/store/auth.store.ts` — Zustand store; `accessToken` lives in memory, `user` is persisted
- `src/pages/` — one file per route; all protected routes wrapped in `ProtectedLayout` in `App.tsx`
- `src/components/ui/` — small unstyled primitives (button, card, input, dialog, select, badge)

### Data model key points
- All data is user-scoped — every table has `user_id` with CASCADE delete
- `Transaction.type` is `'income' | 'expense'` (string, not enum)
- `HoldingSnapshot` has a unique constraint on `(holding_id, period)` — one snapshot per holding per period (e.g. `"2026-05"`)
- New users get 9 default categories seeded in `AuthService.register()`

## Prisma Workflow

Always run `prisma generate` after editing `schema.prisma`. For a new migration:
```bash
# from apps/api/
npx prisma migrate dev --name <migration_name>
```

The `binaryTargets` in `schema.prisma` includes `linux-musl-openssl-3.0.x` for Alpine Docker compatibility — do not remove it.

## Docker Notes

The API Dockerfile installs `openssl` via `apk` (required for Prisma on Alpine). The `apps/api/tsconfig.json` has `esModuleInterop: true` — required for `cookie-parser`, `helmet`, and `express-rate-limit` default imports to work after compilation.

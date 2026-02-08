# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Personal Investment Diary System** (投資日記系統) - a single-user application for tracking investment diaries with Markdown writing, in-app alerts, and stock portfolio management using FIFO cost basis calculation.

**Tech Stack:** Nuxt 3 + Vue 3 + TypeScript + MySQL + Prisma ORM + Tailwind CSS

**Language:** Chinese (Traditional) is the primary language for UI and documentation.

## Development Commands

```bash
# Development
npm run dev                    # Start development server with hot-reload

# Database setup
npx prisma generate            # Generate Prisma client
npx prisma migrate dev         # Create and apply migrations
npx prisma studio              # Open Prisma Studio to view database
npm run seed                   # Seed database with sample data

# Build & Deploy
npm run build                  # Build for production
npm run preview                # Preview production build locally
npm run generate               # Generate static site (SSG)

# Testing
npm test                       # Run all tests
npm run test:watch             # Run tests in watch mode
npm run test:coverage          # Generate coverage report

# Health Checks
npm run health:check           # Run comprehensive health check (Git pre-commit)
npm run health:full            # Full health check + build verification (Git pre-push)
npm run health:quick           # Quick health check (tests + Prisma validation)
```

## Automated Health Check System

This project includes an **automated health check system** that runs after every code change to ensure system stability.

### What Gets Checked

1. **Environment Variables** - Verifies `.env` file exists and `DATABASE_URL` is configured
2. **Prisma Schema** - Validates Prisma schema syntax
3. **TypeScript Compilation** - Checks for TypeScript errors
4. **Unit Tests** - Runs all test suites
5. **Database Connection** - Verifies MySQL is accessible
6. **Dependencies** - Ensures `node_modules` and `.nuxt` are present

### When Health Checks Run

- **Pre-commit**: Automatically runs `npm run health:check` before each Git commit
- **Pre-push**: Automatically runs `npm run health:full` before each Git push
- **Manual**: Run `npm run health:check` anytime to verify system health

### Health Check API Endpoint

The system exposes `GET /api/health` for monitoring:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 15
    },
    "server": {
      "status": "ok",
      "uptime": 3600,
      "environment": "development"
    }
  }
}
```

### Health Status Component

The `<HealthStatus>` component displays system status in the UI:
- Green indicator with "系統正常" when healthy
- Red indicator with "系統異常" when unhealthy
- Auto-refreshes every 30 seconds
- Shows error details on click

### Skipping Health Checks

If you need to skip health checks during Git operations:

```bash
# Skip pre-commit check
git commit --no-verify -m "WIP: experimental changes"

# Skip pre-push check
git push --no-verify
```

**Warning**: Only skip checks if you're certain the changes are safe!

## Architecture Overview

### Full-Stack Nuxt Pattern
- **Hybrid Rendering:** SSR + SSG via Nuxt 3
- **File-based Routing:** `pages/` directory automatically generates routes
- **Server API Routes:** `server/api/` contains serverless endpoints
- **Auto-imports:** Components, composables, and utilities are auto-imported

### Data Layer
- **ORM:** Prisma with MySQL 8.0+
- **Prisma Client Singleton:** `lib/prisma.ts` exports a single instance with hot-reload support in dev
- **Cascade Deletes:** Deleting a diary auto-deletes its alerts and transactions
- **Runtime Config:** Database URL from `DATABASE_URL`, app name from `NUXT_PUBLIC_APP_NAME`

### Database Models
Three main tables with foreign key relationships:
- **Diary** - Main diary entries with `date` field (defaults to now), title required, content optional
- **Alert** - Time-based alerts linked to diaries (trigger_at, is_dismissed)
- **Transaction** - Stock trades linked to diaries (BUY/SELL, FIFO calculation)

**Important:**
- Holdings are calculated dynamically using average cost method (not true FIFO matching) via `lib/utils.ts`
- Diary `date` field enforces uniqueness: only one diary per day (checked via date range query)
- All relations use cascade deletes
- The `date` field is separate from `createdAt`/`updatedAt` timestamps
- Content field is optional in schema (can create diary without body)

### Key Architecture Decisions

1. **No Authentication:** Single-user personal system
2. **Alert System:** Nitro cron jobs check triggers (to be implemented)
3. **Markdown Rendering:** `@nuxtjs/mdc` for rich text with component support
4. **Dark Mode:** Tailwind CSS class-based (`dark` class toggle)
5. **Type Safety:** Full TypeScript with Zod validation

## File Structure Patterns

### API Routes Naming Convention
RESTful pattern in `server/api/`:
- `diaries.get.ts` - GET /api/diaries
- `diaries.post.ts` - POST /api/diaries (returns 409 Conflict if diary exists for same date)
- `diaries/[id].get.ts` - GET /api/diaries/:id
- `diaries/[id].put.ts` - PUT /api/diaries/:id
- `diaries/[id].delete.ts` - DELETE /api/diaries/:id
- `diaries/by-date.get.ts` - GET /api/diaries/by-date?date=YYYY-MM-DD (fetch by date)
- `transactions/latest.get.ts` - GET /api/transactions/latest (reuse holdings)
- `stocks/holdings.get.ts` - GET /api/stocks/holdings (calculated positions)
- `alerts.get.ts` - GET /api/alerts
- `alerts.post.ts` - POST /api/alerts
- `alerts/[id]/dismiss.put.ts` - PUT /api/alerts/:id/dismiss

### Component Organization
- `pages/` - Route pages (auto-imported)
- `components/` - Reusable Vue components (auto-imported)
- `layouts/` - Layout wrappers (currently using default from `app.vue`)

### Database Schema Changes
When modifying `prisma/schema.prisma`:
1. Make changes to schema
2. Run `npx prisma migrate dev --name description`
3. Prisma auto-generates TypeScript types

## Environment Variables

Required in `.env` (see `.env.example`):
```bash
DATABASE_URL="mysql://username:password@localhost:3306/invest_diary"
NUXT_PUBLIC_APP_NAME="投資日記"
```

## Special Implementation Details

### Holdings Cost Calculation (lib/utils.ts)
Holdings use average cost method (simplified FIFO):
- BUY transactions add to position: quantity increases, total cost += quantity × price
- SELL transactions reduce position: quantity decreases, cost reduces by average cost basis
- Average cost = total cost / remaining quantity
- Sell cost calculated as: quantity × current average cost (not true lot matching)
- Holdings with zero quantity are removed from results
- Functions: `calculateHoldings()`, `getHoldingBySymbol()`

### Alert System
- Alerts stored with `trigger_at` timestamp
- `is_dismissed` flag for user dismissal
- Nitro cron jobs (planned) will poll and trigger due alerts
- Frontend displays active alerts via `components/AlertNotification.vue`

### Transaction Reuse
When creating new diaries, users can copy holdings from the latest transaction record via `/api/transactions/latest`.

## UI/UX Patterns

- **Responsive:** Mobile-first with Tailwind breakpoints
- **Icons:** Heroicons via `@nuxt/icon` (auto-imported as `<i-heroicons-name>`)
- **Forms:** Use Zod for validation schema
- **Dates:** `Intl.DateTimeFormat` for localization (zh-TW) in `lib/utils.ts`
- **Currency:** `Intl.NumberFormat` for TWD currency formatting

## Current Implementation Status

Based on README.md checklist:
- ✅ Stage 1: Database setup (complete)
- ✅ Stage 2: Backend API routes (complete)
- ✅ Stage 3: Frontend UI components (complete)
- ⏳ Stage 4: Core functionality integration (in progress)
- ⏳ Stage 5: Configuration & documentation (in progress)

## Important Notes

- All API responses include console logging for debugging
- Error handling uses `createError()` from Nuxt with appropriate status codes
- Date/time fields use `DateTime` type in Prisma, stored as `DATETIME` in MySQL
- Chinese characters supported via `utf8mb4` (MySQL default)
- Cascade deletes configured at Prisma relation level
- MySQL is running in docker
- Seed script uses `tsx` to run TypeScript directly
- Alert cron jobs are planned but not yet implemented

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
```

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
- **Diary** - Main diary entries (title, content, timestamps)
- **Alert** - Time-based alerts linked to diaries (trigger_at, is_dismissed)
- **Transaction** - Stock trades linked to diaries (BUY/SELL, FIFO calculation)

**Important:** Holdings are calculated dynamically using FIFO, not stored in the database.

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
- `diaries.post.ts` - POST /api/diaries
- `diaries/[id].put.ts` - PUT /api/diaries/:id
- `diaries/[id].delete.ts` - DELETE /api/diaries/:id
- `transactions/latest.get.ts` - GET /api/transactions/latest

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

### FIFO Cost Calculation
Stock holdings use First-In-First-Out method:
- BUY transactions add to position
- SELL transactions reduce oldest positions first
- Average cost recalculated dynamically from all transactions
- Logic should be centralized in utilities (see `lib/utils.ts`)

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
- **Dates:** `date-fns` for formatting (e.g., `format(date, 'yyyy-MM-dd')`)

## Current Implementation Status

Based on README.md checklist:
- ✅ Stage 1: Database setup (complete)
- ✅ Stage 2: Backend API routes (complete)
- ✅ Stage 3: Frontend UI components (complete)
- ⏳ Stage 4: Core functionality integration (in progress)
- ⏳ Stage 5: Configuration & documentation (in progress)

## Important Notes

- All API responses include console logging for debugging
- Error handling uses `createError()` from Nuxt
- Date/time fields use `DateTime` type in Prisma, stored as `DATETIME` in MySQL
- Chinese characters supported via `utf8mb4` (MySQL default)
- Cascade deletes configured at Prisma relation level

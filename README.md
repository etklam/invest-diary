# Diary Vue

## What it is

Personal investment diary app. Nuxt 4 + TypeScript + MariaDB 11.4 + Prisma (the Prisma `mysql` provider). Tracks investment diaries, stock/ETF watchlists, market rotation, blog, alerts, partner compare, and agent API.

## Core workflows

See [docs/WORKFLOWS.md](docs/WORKFLOWS.md) for the full workflow summary.

- Authentication — JWT access + refresh tokens, httpOnly cookies
- Diary — markdown entries with tags, calendar view, related alerts
- Stock tracking — watchlist, transactions, price alerts, Yahoo Finance integration
- ETF / Market rotation — watchlist, profile aggregator, daily batch
- Blog — markdown articles, admin + public views
- Alerts — quick reminders and recurring WEEK/MONTH alerts
- Partner compare — diary sharing with privacy boundaries
- Agent API — programmatic diary ingestion with scoped API keys

## Tech stack

Nuxt 4, Vue 3, TypeScript, MariaDB 11.4, Prisma, Vitest, Playwright, Tailwind CSS, vue-i18n (EN / zh-TW / zh-CN), PWA.

## Quick start

```bash
git clone https://github.com/etklam/invest-diary.git
cd invest-diary
npm install
cp .env.example .env  # then fill in DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npm run seed
npm run dev
```

Open http://localhost:3000.

## Common commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm test` | Run unit + API + integration tests |
| `npm run test:coverage` | Coverage report |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript checking |
| `npm run build` | Production build |
| `npm run health:full` | Health check + build |
| `npm run docs:check` | Validate docs (links, placeholders, whitelist) |
| `npm run openapi:check` | Validate generated OpenAPI/client artifacts |
| `npm run test:backend-http:mariadb` | Real Nitro + MariaDB 11.4 release gate |

## Documentation

| Document | Purpose |
|---|---|
| [docs/WORKFLOWS.md](docs/WORKFLOWS.md) | Current project workflow summary |
| [docs/API.md](docs/API.md) | API reference |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy |
| [docs/operations/DEPLOYMENT.md](docs/operations/DEPLOYMENT.md) | Deployment guide |
| [docs/operations/HEALTH_CHECK.md](docs/operations/HEALTH_CHECK.md) | Health check documentation |
| [docs/operations/BACKUP_RESTORE.md](docs/operations/BACKUP_RESTORE.md) | Backup and restore |
| [CLAUDE.md](CLAUDE.md) | AI agent guidance |
| [CONTEXT.md](CONTEXT.md) | Domain language and decisions |
| [DESIGN.md](DESIGN.md) | Design system |
| [PRODUCT.md](PRODUCT.md) | Product positioning |

## Beta Cockpit (archived)

The Beta Cockpit UI has been retired. The `decideBetaAllocation` policy is
retained for the Current Market Summary. The design reference, cron schedule,
exposure buckets, and limitations remain documented in
[docs/BETA_COCKPIT.md](docs/BETA_COCKPIT.md) (archived). The delivered source
plan is archived under [docs/archive/completed/2026-06/](docs/archive/completed/2026-06/).

## License

Private project, no open-source license.

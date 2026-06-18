# Diary Vue

## What it is

Personal investment diary app. Nuxt 4 + TypeScript + MySQL 8 + Prisma. Tracks investment diaries, stock/ETF watchlists, market rotation, blog, alerts, partner compare, agent API, and Telegram integration.

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
- Telegram bot — diary intake via chat commands

## Tech stack

Nuxt 4, Vue 3, TypeScript, MySQL 8, Prisma, Vitest, Playwright, Tailwind CSS, vue-i18n (EN / zh-TW / zh-CN), PWA.

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

## Documentation

| Document | Purpose |
|---|---|
| [docs/WORKFLOWS.md](docs/WORKFLOWS.md) | Current project workflow summary |
| [docs/API.md](docs/API.md) | API reference |
| [docs/TESTING.md](docs/TESTING.md) | Testing strategy |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Deployment guide |
| [docs/HEALTH_CHECK.md](docs/HEALTH_CHECK.md) | Health check documentation |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | Backup and restore |
| [CLAUDE.md](CLAUDE.md) | AI agent guidance |
| [CONTEXT.md](CONTEXT.md) | Domain language and decisions |
| [DESIGN.md](DESIGN.md) | Design system |
| [PRODUCT.md](PRODUCT.md) | Product positioning |

## Beta Cockpit

The Market Rotation Monitor upgrade produces a Beta allocation recommendation
from market state + breadth + rotation ranks. Design, cron schedule, exposure
buckets, and limitations are documented in
[docs/BETA_COCKPIT.md](docs/BETA_COCKPIT.md). The source plan lives at
[docs/plans/active/beta-cockpit-plan.md](docs/plans/active/beta-cockpit-plan.md).

## License

Private project, no open-source license.

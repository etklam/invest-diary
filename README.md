# Diary Vue

## What it is

Personal investment diary app. Nuxt 4 + TypeScript + MariaDB 11.4 + Prisma (the Prisma `mysql` provider). Tracks investment diaries, stock/ETF watchlists, market rotation, blog, alerts, partner compare, and agent API.

## Core workflows

See [docs/WORKFLOWS.md](docs/WORKFLOWS.md) for the full workflow summary.

- Authentication — browser httpOnly cookies or native JSON sessions with Bearer JWTs
- Diary — markdown entries with tags, calendar view, related alerts
- Stock tracking — watchlist, transactions, price alerts, Yahoo Finance integration
- ETF / Market rotation — watchlist, profile aggregator, daily batch
- Blog — markdown articles, admin + public views
- Alerts — quick reminders and recurring WEEK/MONTH alerts
- Partner compare — diary sharing with privacy boundaries
- Agent API — programmatic diary ingestion with scoped API keys

## Tech stack

Nuxt 4, Vue 3, TypeScript, MariaDB 11.4, Prisma, Vitest, Playwright, Tailwind CSS, vue-i18n (EN / zh-TW / zh-CN), PWA.

## Runtime topology

The supported production path is a modular Nuxt/Nitro monolith on K3s with
MariaDB 11.4. The web deployment intentionally runs one active
realtime/scheduler instance: WebSocket delivery and market-data cache are
process-local, while Market Rotation runs in a K8s CronJob that calls the
shared batch domain directly.

Production app and batch containers emit structured JSON logs with
`LOG_FORMAT=json`. Cluster log collection should alert on `level == "ERROR"`
and use the operation plus `requestId`/`jobId` fields for triage. Redis,
BullMQ, distributed locks, and a service split are outside the current
topology; revisit them only when a real horizontal-scaling requirement exists.
REST is the source of truth for clients. Socket.IO is an optional foreground
freshness hint; it is not a background delivery or consistency guarantee.

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
| `npm run typecheck:tests` | Critical test/helper typechecking |
| `npm run build` | Production build |
| `npm run health:full` | Health check + build |
| `npm run docs:check` | Validate docs (links, placeholders, whitelist) |
| `npm run openapi:check` | Validate generated OpenAPI/client artifacts |
| `npm run test:socketio` | Real Socket.IO listener/handshake contract |
| `npm run test:native-client` | React Native/Expo-like standard-fetch client contract |
| `npm run test:diary-reconciliation:mysql` | MariaDB 11.4 reconciliation gate |
| `npm run test:backend-http:mariadb` | Real Nitro + MariaDB 11.4 release gate |
| `npm run test:market-rotation:mysql` | MariaDB 11.4 market-rotation gate |
| `npm run test:e2e` | Playwright E2E; required on `main` push before deploy |

Pull requests run the fast `quality` path. A push to `main` runs the same
quality path, then the full Playwright E2E job, and only then builds, pushes,
and deploys the image. E2E provisions its own disposable MariaDB 11.4
database and must not reuse a quality-job or production-like database.

## Documentation

| Document | Purpose |
|---|---|
| [docs/WORKFLOWS.md](docs/WORKFLOWS.md) | Current project workflow summary |
| [docs/API.md](docs/API.md) | API reference |
| [docs/backend-readiness.md](docs/backend-readiness.md) | Current Backend Ready / React Native readiness |
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

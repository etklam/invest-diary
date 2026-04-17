# Diary Vue

A personal investment diary application built with Nuxt 4, featuring investment journaling, stock portfolio tracking, and an educational blog.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1+-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5.27-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Tech Statement

**Diary Vue** is a full-stack investment journaling platform designed to help traders and investors track their trading decisions, analyze portfolio performance, and build disciplined trading habits through systematic record-keeping.

### Purpose

This application addresses the critical need for **investment discipline** by providing:
- **Structured Journaling**: Document trading decisions with context, emotions, and market conditions
- **Portfolio Analytics**: Track stock transactions and calculate real-time holdings
- **Performance Insights**: Analyze trading patterns and identify areas for improvement
- **Educational Resources**: Access curated investment education content through the blog
- **Behavioral Tools**: Position sizing calculator, seasonality analyzer, and discipline reminders

### Technology Choices

**Frontend Framework**: Nuxt 4 (Vue 3 Composition API)
- Server-side rendering (SSR) for SEO and performance
- File-based routing for intuitive page structure
- Auto-imported components and composables
- Built-in TypeScript support

**Database**: MySQL 8.0+ with Prisma ORM
- Relational data model for complex investment relationships
- Type-safe database queries with Prisma Client
- Migration system for schema versioning
- Optimized indexes for query performance

**Authentication**: JWT with httpOnly cookies
- Secure token storage (not localStorage)
- Refresh token rotation for extended sessions
- Token versioning for instant invalidation
- CSRF protection via SameSite cookies

**Styling**: TailwindCSS + @tailwindcss/typography
- Utility-first CSS for rapid development
- Dark mode support with system preference detection
- Responsive design with mobile-first approach
- Typography plugin for markdown content

**Internationalization**: @nuxtjs/i18n
- Multi-language support (EN, ZH-TW, ZH-CN)
- Browser language detection
- Lazy-loaded translation files

**Progressive Web App**: @vite-pwa/nuxt
- Installable to home screen (mobile/desktop)
- Service Worker for auto-updates
- Runtime caching for static assets
- Network-only strategy for API routes (no offline data caching)

**Content Management**: @nuxtjs/mdc (Markdown Components)
- Markdown-based blog system
- Syntax highlighting with Shiki
- GitHub Flavored Markdown support
- Rehype plugins for enhanced rendering

**Performance**: Nitro SWR (Stale-While-Revalidate)
- Edge-compatible server engine
- Built-in caching with configurable TTL
- Cloudflare CDN support
- Optimized for serverless deployment

**Testing**: Vitest + Playwright
- Unit tests for business logic
- Integration tests for workflows
- E2E tests for critical user paths
- Coverage reporting

### Architecture Highlights

- **Server Middleware**: Global authentication on all `/api/**` routes
- **Composables**: Reusable state management (auth, alerts, toasts)
- **Type Safety**: End-to-end TypeScript from database to UI
- **SEO**: Dynamic sitemap generation, meta tags, Open Graph support
- **Security**: Input validation with Zod, DOMPurify for markdown sanitization
- **Deployment**: Docker multi-stage builds, production-ready configuration

## Features

- **Investment Journaling**: Daily diary entries with markdown support
- **Partner Compare**: Pair with a human or AI partner account, share diary timelines at the account level, and compare same-day entries side by side without exposing stock holdings
- **Agent Diary Ingestion**: Create scoped API keys for partner accounts so external agents can create diaries through a write-only diary endpoint
- **Portfolio Tracking**: Stock transaction management (BUY/SELL) with holdings calculation
- **Position Sizing Calculator**: Advanced tool for calculating staged position entries with multiple strategies (pyramid, inverted pyramid, rectangular)
- **Stock Seasonality Analyzer**: US stock market seasonal patterns based on historical data from 1950-present, with monthly performance analysis
- **Alert System**: Time-based reminders for diary entries with recurring options (weekly/monthly), centralized alerts page
- **Calendar View**: Visual calendar interface for viewing and managing diary entries by date
- **Investment Discipline**: Custom motivational quotes for trading psychology with shareable content
- **Educational Blog**: Public investment education articles (admin-managed) with category filtering
- **Multi-language**: English, Traditional Chinese (繁體中文), Simplified Chinese (简体中文)
- **Dark/Light Mode**: System preference detection with manual toggle
- **PWA Support**: Installable progressive web application with controlled runtime caching (API excluded)
- **Authentication**: JWT-based with secure httpOnly cookies
- **Performance**: SWR caching with Cloudflare CDN support
- **SEO**: Dynamic sitemap generation for search engine optimization
- **Image Optimization**: Automated image optimization with @nuxt/image

## Screenshots

> TODO: Add application screenshots

## Partner Compare & Agent Diaries

Diary Vue now supports side-by-side diary comparison between your account and a partner account. A partner can be another human user or an AI-operated account. Sharing is configured at the partner-link level for the whole account timeline, while stock holdings remain private.

### Typical Flow

1. Sign in with both accounts.
2. Open `Settings` and add the partner by email.
3. Accept the partner link from the other account, then let each side decide whether to share diaries.
4. Open `/timeline/compare` to review same-day diary entries side by side.
5. If the partner is an AI agent, create an API key under `Settings` for that partner account.

### Agent Diary API

`POST /api/agent/diaries`

Headers:

- `x-api-key: <raw key>`
- `Authorization: Bearer <raw key>`

Body example:

```json
{
  "title": "AI market review 2026-04-09",
  "content": "Semiconductor leadership broadened while breadth stayed mixed.",
  "date": "2026-04-09",
  "tags": ["market", "ai"]
}
```

Notes:

- API keys are currently scoped to `DIARY_CREATE`
- The raw key is shown only once when you create it
- API key writes cannot use `appendToToday`
- Compare view shows diary content and tags, but not stock holdings

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MySQL** 8.0+
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/diary-vue.git
cd diary-vue

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# (Optional) Seed database with test data
npm run seed

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Default Admin User

After seeding, you can login with:
- **Email**: `admin@example.com`
- **Password**: `admin123`

> **Important**: Change the default password after first login in production!

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build           # Build for production
npm run preview         # Preview production build
npm run generate        # Static site generation

# Database
npm run seed            # Seed database with test data
npx prisma studio       # Open Prisma Studio (DB GUI)
npx prisma migrate dev  # Create and apply migrations

# Testing
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright E2E tests

# Code Quality
npm run lint            # ESLint
npm run typecheck       # TypeScript checking

# Health Checks
npm run health:check    # System health validation
npm run health:full     # Health check + build
npm run health:quick    # Quick tests + Prisma validate
```

## PWA Architecture

This project uses PWA **as a mobile app shell**, not as an offline-first application.

### Design Principles

- ✅ Installable to home screen (Android / desktop Chrome)
- ✅ Auto-update via Service Worker
- ✅ Runtime caching for static assets/fonts; API routes are always network-only
- ✅ API routes are never cached

### Core Files

- [`composables/useAppPWA.ts`](composables/useAppPWA.ts:1)
  - Centralized PWA state management
  - Handles `beforeinstallprompt`
  - Tracks install status and SW updates

- [`components/PWAInstallPrompt.vue`](components/PWAInstallPrompt.vue:1)
  - Install banner with 7-day dismiss logic
  - i18n-enabled

- [`components/PWAUpdatePrompt.vue`](components/PWAUpdatePrompt.vue:1)
  - Notifies users when a new version is available

- [`nuxt.config.ts`](nuxt.config.ts:174)
  - PWA manifest configuration
  - Workbox runtime caching for static assets/fonts with API `NetworkOnly`

### Known Platform Differences

- **iOS Safari** does not support `beforeinstallprompt`
  - Users must install via *Share → Add to Home Screen*
  - This is expected behavior

---

## Project Structure

```
├── app.vue              # Root application wrapper
├── components/          # Reusable Vue components (20 components)
├── composables/         # Vue composition functions
├── layouts/             # Nuxt layouts (default, authenticated)
├── pages/               # File-based routing
│   ├── auth/           # Authentication pages (login, register)
│   ├── admin/          # Admin panel (blog management)
│   ├── blog/           # Public blog pages (list, post detail)
│   ├── settings/       # User settings
│   ├── stocks/         # Portfolio management
│   ├── tools/          # Investment tools (position sizing calculator, seasonality analyzer)
│   ├── timeline/       # Diary timeline view
│   ├── calendar/       # Calendar view for diary entries
│   ├── alerts/         # Centralized alerts page
│   ├── discipline/     # Investment discipline/quotes management
│   └── diaries/        # Diary CRUD (create, edit, view)
├── server/              # Nitro API routes & middleware
│   ├── api/            # RESTful endpoints
│   └── middleware/     # Server middleware (JWT auth)
├── lib/                 # Shared utilities
│   ├── prisma.ts       # Prisma client singleton
│   ├── positionSizing.ts # Position sizing calculation logic
│   ├── stockSeasonality.ts # Stock seasonality analysis (monthly patterns)
│   ├── recurring-alerts.ts # Recurring alert date calculation and generation
│   ├── blog.ts         # Blog utilities
│   ├── jwt.ts          # JWT utilities
│   ├── disciplineShare.ts # Discipline sharing utilities
│   └── utils.ts        # General utilities
├── prisma/              # Database schema, migrations, seed
├── i18n/locales/        # Translation files (en, zh-TW, zh-CN)
├── assets/              # Static assets (CSS, images)
│   └── css/            # Custom CSS (design tokens, markdown, mobile)
├── public/              # Public static files
├── scripts/             # Utility scripts (health check)
└── tests/               # Unit, integration, and E2E tests
```

## Database Schema

- **User** - Authentication + investment settings
- **Diary** - Investment journal entries with markdown content
- **Transaction** - Stock trades (BUY/SELL) linked to diaries
- **Alert** - Time-based reminders for diary entries with recurring support (WEEK/MONTH modes)
- **Discipline** - Investment principles/quotes with shareable tokens
- **Post** - Blog articles with category filtering (DRAFT/PUBLISHED/ARCHIVED)

See `prisma/schema.prisma` for detailed relationships and constraints.

## Investment Tools

### Stock Seasonality Analyzer
Located at `/tools/seasonality`, this tool provides:
- **Monthly Performance Data**: Average returns for each month based on S&P 500 historical data (1950-present)
- **Current Month Insights**: Real-time analysis of the current and upcoming month
- **Best/Worst Months**: Identifies historically strong (Nov, Dec, Apr, Jul) and weak (Sep, Feb, Aug) months
- **Period Analysis**: Strong period (Nov-Apr) vs weak period (May-Oct) comparison
- **Volatility Assessment**: Monthly volatility levels from low to high
- **Investment Recommendations**: Context-aware suggestions based on seasonal patterns
- **Export to Markdown**: Copy analysis as formatted markdown for sharing

**Data Source**: Historical S&P 500 index data from 1950 to present, providing statistical patterns rather than absolute predictions.

### Position Sizing Calculator
Located at `/tools/position-sizing`, this tool helps traders:
- Calculate optimal position sizes using multiple strategies
- Implement pyramid, inverted pyramid, and rectangular entry methods
- Manage risk through staged position entries

## Environment Variables

Create a `.env` file in the project root:

```bash
# Database (Required)
DATABASE_URL="mysql://username:password@localhost:3306/invest_diary"

# JWT (Required - Generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-key-for-jwt"

# App Configuration
NUXT_PUBLIC_APP_NAME="投資日記"

# Site URL (Required for production - used for SEO/Sitemap)
NUXT_PUBLIC_SITE_URL="https://your-domain.com"

# Scheduler (Optional - Set to "true" only on one instance in multi-instance deployments)
# If not set, only one instance will run scheduled tasks to avoid duplicates
SCHEDULER_ENABLED="true"
```

### Generating a Secure JWT Secret

```bash
openssl rand -base64 32
```

## Deployment

### Docker Deployment (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for detailed deployment instructions, including:
- External MySQL configuration
- Nginx reverse proxy setup
- SSL/TLS with Let's Encrypt
- Production checklist
- Backup and restore procedures

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
node .output/server/index.mjs
```

## Documentation

- **[`CLAUDE.md`](CLAUDE.md)** - Technical documentation for developers (architecture patterns, critical gotchas)
- **[`DEPLOYMENT.md`](DEPLOYMENT.md)** - Deployment guide (Docker, manual, production checklist)
- **[`IMPROVEMENTS.md`](IMPROVEMENTS.md)** - Planned features and enhancement roadmap
- **[`docs/TESTING.md`](docs/TESTING.md)** - Testing guide and best practices
- **[`docs/HEALTH_CHECK.md`](docs/HEALTH_CHECK.md)** - Health check system documentation

## Roadmap

See [`IMPROVEMENTS.md`](IMPROVEMENTS.md) for planned features including:
- Security enhancements (XSS protection, CSP headers)
- Developer experience improvements (ESLint, Prettier)
- Complete test coverage
- UI/UX and accessibility improvements
- Performance optimizations

## Contributing

Contributions are welcome! Please see [`docs/TESTING.md`](docs/TESTING.md) for testing guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Run health check: `npm run health:check`
6. Commit your changes: `git commit -m 'Add some feature'`
7. Push to the branch: `git push origin feature/my-feature`
8. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow Vue 3 Composition API patterns
- Run `npm run lint` before committing
- Add tests for new features
- Update documentation as needed

## Scripts

The project includes utility scripts in the `scripts/` directory:

### Health Check Script

**Location**: `scripts/health-check.ts`

**Features**:
- Database connection validation
- Server status monitoring
- Environment variable verification
- Prisma schema validation

**Usage**:
```bash
npm run health:check    # Basic health check
npm run health:full     # Health check + production build
npm run health:quick    # Quick tests + Prisma validate
```

**Health Check Endpoint**:

The application provides a runtime health check endpoint:

```bash
curl http://localhost:3000/api/health
```

Healthy responses return HTTP `200`. If the database check fails, the endpoint returns
HTTP `503` with the same payload shape and an error message in
`checks.database.message`.

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

## Troubleshooting

### Common Issues

**Problem**: Blog posts show "文章不存在" (article not found)
- **Solution**: Check the PWA + Nitro params section in [`CLAUDE.md`](CLAUDE.md)

**Problem**: Database connection failed
- **Solution**: Verify `DATABASE_URL` in `.env`, ensure MySQL is running

**Problem**: Port 3000 already in use
- **Solution**: Change port in `.env` or stop the conflicting process

**Problem**: PWA not installing
- **Solution**: Ensure HTTPS is enabled (required for PWA), or use `localhost` in development

**Problem**: Images not loading correctly
- **Solution**: Check that image files exist in `public/` directory, verify paths in `<NuxtImg>` components

**Problem**: Dark mode not persisting
- **Solution**: Clear localStorage, check browser console for color-mode errors, verify `@nuxtjs/color-mode` configuration

For more troubleshooting tips, see [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## ⚠️ Critical: Known Issues & Gotchas

### Blog Slug & PWA Dynamic Routes

If you encounter issues with dynamic API routes (e.g., blog posts not loading):

**Symptoms**:
- Blog list works fine
- Individual posts show "文章不存在" (article not found)
- Network tab shows `400 Slug is required (from service worker)`

**Root Cause**: Service Worker caching API routes incorrectly

**Solution**: See detailed troubleshooting in [`CLAUDE.md`](CLAUDE.md) - PWA + Nitro Dynamic Route section

### Prisma + Vite Development Errors

If you see Prisma-related errors in local development (but production works):

**Symptoms**:
- `(0, Fo.promisify) is not a function`
- `The requested module does not provide an export named 'Decimal'`
- 500 errors on pages using Prisma

**Root Cause**: Vite bundling Prisma runtime as client dependency

**Solution**: See detailed fix in [`CLAUDE.md`](CLAUDE.md) - Prisma + Nuxt + Vite section

## License

MIT

## Support

For issues, questions, or contributions, please visit the GitHub repository.

---

**Built with ❤️ for investment tracking and journaling**

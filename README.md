# Diary Vue

A personal investment diary application built with Nuxt 3, featuring investment journaling, stock portfolio tracking, and an educational blog.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1+-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5.27-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Investment Journaling**: Daily diary entries with markdown support
- **Portfolio Tracking**: Stock transaction management (BUY/SELL) with holdings calculation
- **Position Sizing Calculator**: Advanced tool for calculating staged position entries with multiple strategies (pyramid, inverted pyramid, rectangular)
- **Alert System**: Time-based reminders for diary entries with centralized alerts page
- **Calendar View**: Visual calendar interface for viewing and managing diary entries by date
- **Investment Discipline**: Custom motivational quotes for trading psychology with shareable content
- **Educational Blog**: Public investment education articles (admin-managed) with category filtering
- **Multi-language**: English, Traditional Chinese (繁體中文), Simplified Chinese (简体中文)
- **Dark/Light Mode**: System preference detection with manual toggle
- **PWA Support**: Installable progressive web application (mobile-first, no offline cache)
- **Authentication**: JWT-based with secure httpOnly cookies
- **Performance**: SWR caching with Cloudflare CDN support
- **SEO**: Dynamic sitemap generation for search engine optimization
- **Image Optimization**: Automated image optimization with @nuxt/image

## Screenshots

> TODO: Add application screenshots

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Nuxt 4 (Vue 3 Composition API) |
| **Language** | TypeScript (bundled with Nuxt) |
| **Database** | MySQL 8.0+ with Prisma ORM |
| **Styling** | TailwindCSS + @tailwindcss/typography |
| **Authentication** | JWT + bcrypt + jose |
| **i18n** | @nuxtjs/i18n |
| **Markdown** | @nuxtjs/mdc (with rehype-pretty-code, shiki) |
| **PWA** | @vite-pwa/nuxt (installable shell, auto-update) |
| **Icons** | @nuxt/icon (Heroicons) |
| **Images** | @nuxt/image |
| **Dark Mode** | @nuxtjs/color-mode |
| **SEO** | @nuxtjs/sitemap (Dynamic XML sitemap) |
| **Caching** | Nitro SWR (Stale-While-Revalidate) |
| **Testing** | Vitest (unit/integration), Playwright (E2E) |
| **Validation** | Zod |

## Quick Start

### Prerequisites

- **Node.js** 18+
- **MySQL** 8.0+
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone <repository-url>
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
- ❌ No offline-first caching (to avoid stale investment data)
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
  - Minimal Workbox setup (no runtime caching)

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
│   ├── tools/          # Investment tools (position sizing calculator)
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
- **Alert** - Time-based reminders for diary entries
- **Discipline** - Investment principles/quotes with shareable tokens
- **Post** - Blog articles with category filtering (DRAFT/PUBLISHED/ARCHIVED)

See `prisma/schema.prisma` for detailed relationships and constraints.

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

## ⚠️ Critical: Blog Slug & PWA Gotcha (Nuxt 3)

If you add or modify **dynamic API routes** (e.g. `/api/blog/:slug`):

### ✅ Mandatory Rules

1. **Do NOT rely on a single slug source**
   - Always fallback through:
     - `event.context.params`
     - `getRouterParam`
     - URL path parsing

2. **Never let PWA cache `/api/**`**
   - APIs must always be `no-store`
   - Otherwise Service Worker may return fake 400/404 errors

### ✅ Reference Implementation

- Slug parsing: `server/api/blog/[slug].get.ts`
- PWA exclusion: `nuxt.config.ts`
- Incident record: [`CLAUDE.md`](CLAUDE.md)

### ✅ Symptoms

- Blog list works
- Clicking post shows "文章不存在"
- Network shows `400 Slug is required (from service worker)`

**If this happens, check PWA + Nitro params first, not Prisma or Vue.**

## License

MIT

## Support

For issues, questions, or contributions, please visit the [GitHub repository](<repository-url>).

---

**Built with ❤️ for investment tracking and journaling**

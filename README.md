# Diary Vue

A personal investment diary application built with Nuxt 3, featuring investment journaling, stock portfolio tracking, and an educational blog.

[![Nuxt](https://img.shields.io/badge/Nuxt-3.4.3+-00DC82?logo=nuxt.js)](https://nuxt.com)
[![Vue](https://img.shields.io/badge/Vue-3.5+-4FC08D?logo=vue.js&logoColor=white)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Investment Journaling**: Daily diary entries with markdown support
- **Portfolio Tracking**: Stock transaction management (BUY/SELL) with holdings calculation
- **Alert System**: Time-based reminders for diary entries
- **Investment Discipline**: Custom motivational quotes for trading psychology
- **Educational Blog**: Public investment education articles (admin-managed)
- **Multi-language**: English, Traditional Chinese (繁體中文), Simplified Chinese (简体中文)
- **Dark/Light Mode**: System preference detection with manual toggle
- **PWA Support**: Offline-capable progressive web application
- **Authentication**: JWT-based with secure httpOnly cookies
- **Performance**: SWR caching with Cloudflare CDN support
- **SEO**: Dynamic sitemap generation for search engine optimization

## Screenshots

> TODO: Add application screenshots

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Nuxt 3 (Vue 3 Composition API) |
| **Language** | TypeScript |
| **Database** | MySQL 8.0+ with Prisma ORM |
| **Styling** | TailwindCSS |
| **Authentication** | JWT + bcrypt |
| **i18n** | @nuxtjs/i18n |
| **Markdown** | @nuxtjs/mdc |
| **PWA** | @vite-pwa/nuxt |
| **Icons** | @nuxt/icon (Heroicons) |
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

## Project Structure

```
├── app.vue              # Root application wrapper
├── components/          # Reusable Vue components
├── composables/         # Vue composition functions
├── layouts/             # Nuxt layouts (default, authenticated)
├── pages/               # File-based routing
│   ├── auth/           # Authentication pages
│   ├── admin/          # Admin panel
│   ├── blog/           # Public blog pages
│   ├── settings/       # User settings
│   ├── stocks/         # Portfolio management
│   └── timeline/       # Diary timeline view
├── server/              # Nitro API routes & middleware
│   ├── api/            # RESTful endpoints
│   └── middleware/     # Server middleware (JWT auth)
├── lib/                 # Shared utilities (Prisma client singleton)
├── prisma/              # Database schema, migrations, seed
├── i18n/locales/        # Translation files (en, zh-TW, zh-CN)
├── assets/              # Static assets (CSS, images)
├── public/              # Public static files
└── tests/               # Unit, integration, and E2E tests
```

## Database Schema

- **User** - Authentication + investment settings
- **Diary** - Investment journal entries
- **Transaction** - Stock trades (BUY/SELL)
- **Alert** - Reminders for diary entries
- **Discipline** - Investment principles/quotes
- **Post** - Blog articles (DRAFT/PUBLISHED/ARCHIVED)

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

## Health Check

The application provides a health check endpoint for monitoring:

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

See [`docs/HEALTH_CHECK.md`](docs/HEALTH_CHECK.md) for details.

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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Type**: Full-stack investment diary application (Nuxt 3 + Vue 3 + Prisma + MySQL)

**Purpose**: Personal investment journaling system for tracking stock transactions, diary entries, and investment discipline/principles. Includes blog functionality and PWA capabilities.

**Languages**: English, Traditional Chinese (zh-TW), Simplified Chinese (zh-CN)

## Development Commands

```bash
# Core development
npm run dev              # Start development server (http://localhost:3000)
npm run build           # Build for production
npm run preview         # Preview production build locally
npm run generate        # Static site generation (SSG)

# Database
npm run seed            # Seed database with test data

# Testing
npm test                # Run Vitest unit/integration tests
npm run test:watch      # Watch mode
npm run test:ui         # Vitest UI
npm run test:coverage   # Coverage report
npm run test:e2e        # Playwright E2E tests
npm run test:ci         # CI pipeline tests

# Code quality
npm run lint            # ESLint
npm run typecheck       # TypeScript checking

# Health checks
npm run health:check    # System health validation
npm run health:full     # Health check + build
npm run health:quick    # Quick tests + Prisma validate
```

## Critical: Nuxt 3 + PWA Known Pitfalls

### Blog Slug / Dynamic Route Incident

**Problem**: Dynamic blog routes (`/blog/:slug`) returned 400 "Slug is required" even when posts existed in database.

**Root Causes**:
1. Nitro dynamic param resolution is not guaranteed in dev + PWA environment
   - `event.context.params.slug` may be `undefined`
   - `getRouterParam(event, 'slug')` may also fail
2. Service Worker (PWA/Workbox) intercepted `/api/**` routes and returned cached or synthetic errors
3. Dev server port changes + SW caching amplified the issue

**Permanent Fixes (DO NOT REMOVE)**:

1. **Defensive slug resolution** - File: `server/api/blog/[slug].get.ts`
   ```ts
   const rawFromParams = event.context?.params?.slug
   const rawFromRouter = getRouterParam(event, 'slug')
   const rawFromPath = event.path?.split('/').filter(Boolean).pop()

   const rawSlug = rawFromParams ?? rawFromRouter ?? rawFromPath
   const slug = rawSlug ? decodeURIComponent(String(rawSlug)) : undefined
   ```

2. **Never cache API routes** - File: `nuxt.config.ts`
   ```ts
   nitro: {
     routeRules: {
       '/api/**': { headers: { 'Cache-Control': 'no-store' } }
     }
   }
   ```

**When adding/modifying dynamic API routes**:
- Always implement fallback slug parsing (params → router → path)
- Never rely on a single slug source
- Ensure API routes remain excluded from PWA caching
- Check Network tab to verify responses are NOT from service worker

### Mobile Navigation & Auth Redirect Issues

**Fixed Issues**:
1. **Mobile nav bar hidden**: Removed static `hidden` class that was overriding dynamic `:class` binding in `components/Navigation.vue:216`
2. **Unauthorized blog redirect**: Added `isAuthenticated` check in `layouts/default.vue:60` before calling `/api/alerts` API to prevent 401 redirects for public blog visitors

**Lessons Learned**:
- Never mix static `class="hidden"` with dynamic `:class` on the same element
- Always check authentication status before making authenticated API calls in shared layouts
- Public routes (like `/blog`) should not trigger auth-dependent logic

## Architecture Overview

### Tech Stack
- **Framework**: Nuxt 4 (4.3.1+) with Vue 3 Composition API
- **Database**: Prisma ORM with MySQL
- **Auth**: JWT tokens (httpOnly cookies) + jose (JWT library) + bcryptjs
- **UI**: TailwindCSS, Heroicons (@nuxt/icon), @tailwindcss/typography
- **Dark Mode**: @nuxtjs/color-mode with system preference detection
- **i18n**: @nuxtjs/i18n (3 locales, no_prefix strategy)
- **PWA**: @vite-pwa/nuxt with service worker, auto-update registration
- **Content**: @nuxtjs/mdc for markdown with rehype-pretty-code and shiki syntax highlighting
- **Images**: @nuxt/image for automatic image optimization
- **SEO**: @nuxtjs/sitemap for dynamic sitemap generation
- **Caching**: Nitro SWR (Stale-While-Revalidate) + Cloudflare CDN
- **External Data**: Taiwan Stock Exchange API (TWSE) + Yahoo Finance Chart API for stock prices
- **Validation**: Zod schemas
- **Testing**: Vitest (unit/integration), Playwright (E2E)

### Directory Structure
```
├── app.vue              # Root wrapper with auth initialization
├── components/          # Vue components (20 components)
├── composables/         # Reusable composition functions (auth, etc.)
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
├── server/              # Nitro API routes & server plugins
│   ├── api/            # RESTful endpoints
│   └── middleware/     # Server middleware (JWT validation)
├── lib/                 # Shared utilities
│   ├── prisma.ts       # Database client singleton
│   ├── positionSizing.ts # Position sizing calculation logic
│   ├── blog.ts         # Blog utilities (slugs, validation)
│   ├── jwt.ts          # JWT signing/verification utilities
│   ├── disciplineShare.ts # Discipline sharing token generation
│   └── utils.ts        # General utilities (date formatting, etc.)
├── prisma/              # Database schema, migrations, seed
├── i18n/locales/        # Translation files (en, zh-TW, zh-CN)
├── assets/              # Static assets (CSS, images)
│   └── css/            # Custom CSS (design tokens, markdown, mobile)
├── public/              # Public static files
├── scripts/             # Utility scripts (health check)
└── tests/               # Unit, integration, and E2E tests
```

### Key Patterns

**Authentication Flow**:
- JWT-based with httpOnly cookies
- Middleware-based route protection
- Automatic redirect for authenticated/unauthenticated users
- Role-based access (USER/ADMIN)
- See: `composables/useAuth.ts`, `server/middleware/auth.ts`

**Database Access**:
- Singleton Prisma client in `lib/prisma.ts`
- Always import from `~/lib/prisma`, never create new instances
- Cascade deletes enabled for user data (diaries, transactions, alerts, posts)
- Financial precision: Decimal(15,4) for monetary values

**Component Patterns**:
- Composition API throughout (`<script setup>`)
- Toast notifications via `useToast()` composable
- Loading states with auth checks (`useAuth().initialized`)
- Responsive design (mobile-first, Tailwind breakpoints)

**API Design**:
- RESTful endpoints under `/api/`
- Consistent error handling with proper HTTP status codes
- Zod validation for request/response schemas
- Defensive programming for dynamic parameters

**Blog System**:
- Category-based filtering using `CategoryFilter.vue` component
- Draft/Published/Archived workflow for posts
- SEO-friendly slugs with defensive parsing (see "Blog Slug Incident")
- Markdown content with syntax highlighting (rehype-pretty-code, shiki)

**Alert System**:
- Centralized alerts page at `/alerts`
- Time-based reminders linked to diary entries
- Uses seed data with proper Diary relationships (alert.diary.id)

**Calendar View**:
- Visual calendar interface at `/calendar`
- Date-based navigation for diary entries
- Integration with diary CRUD operations

**Discipline Sharing**:
- Shareable discipline quotes via token-based system
- Utilities in `lib/disciplineShare.ts` for token generation
- Public sharing links for motivational content

**i18n Implementation**:
- Cookie-based locale persistence (`i18n_locale`)
- No URL prefix strategy (`strategy: 'no_prefix'`)
- Lazy-loaded locale files from `i18n/locales/`
- Fallback to English

### i18n Requirements (MANDATORY)

**When Adding New Features**:
1. **Always provide i18n translations** for ALL user-facing text
2. **Never hardcode UI text** in components - use `t()` function
3. **Update all 3 locale files**: `en.json`, `zh-TW.json`, `zh-CN.json`
4. **Follow the translation key structure**: `feature.action.message`

**Usage in Vue Components**:
```ts
// In <script setup>
const { t } = useI18n()

// For static text
const title = t('stock.title')

// For text with parameters
const message = t('stock.waitForCooldown', { seconds: 30 })

// In template
<template>
  <button>{{ t('common.save') }}</button>
  <p>{{ t('stock.fetchSuccess') }}</p>
</template>
```

**Translation Key Structure**:
- Use nested objects for logical grouping
- Match the feature/page structure
- Examples:
  - `common.*` - Shared UI elements (buttons, labels)
  - `nav.*` - Navigation items
  - `stock.*` - Stock management features
  - `diary.*` - Diary-related features
  - `error.*` - Error messages

**Parameterized Translations**:
```json
// In locale files
{
  "stock": {
    "waitForCooldown": "Please wait {seconds} seconds"
  }
}

// In component
t('stock.waitForCooldown', { seconds: 60 })
```

**Best Practices**:
1. Keep translations short and concise
2. Use consistent terminology across locales
3. Test all 3 languages when adding new features
4. Use meaningful key names (not `text1`, `msg2`, etc.)
5. Group related translations together
6. Place placeholders at the end of sentences when possible

**PWA Configuration**:
- Auto-update registration type
- Standalone display mode
- Runtime caching for external resources (Google Fonts)
- CRITICAL: API routes must always be `NetworkFirst` with no-store header

### Image Optimization with @nuxt/image

The application uses `@nuxt/image` for automatic image optimization:

**Features**:
- Automatic format conversion (WebP, AVIF)
- Responsive image generation with srcset
- Lazy loading support
- Image resizing and quality optimization

**Usage in Components**:
```vue
<template>
  <!-- Basic usage -->
  <NuxtImg src="/images/photo.jpg" alt="Description" />

  <!-- With dimensions -->
  <NuxtImg src="/images/photo.jpg" width="300" height="200" />

  <!-- With format and quality -->
  <NuxtImg src="/images/photo.jpg" format="webp" quality="80" />

  <!-- Lazy loading -->
  <NuxtImg src="/images/photo.jpg" loading="lazy" />
</template>
```

**Best Practices**:
- Always provide alt text for accessibility
- Use `loading="lazy"` for below-fold images
- Specify width/height for proper aspect ratio preservation
- Use format="webp" for modern browsers

### Dark/Light Mode Implementation

The application uses `@nuxtjs/color-mode` for theme switching:

**Configuration** (nuxt.config.ts):
```ts
colorMode: {
  classSuffix: '',
  fallback: 'light',
  preference: 'system'  // Respects user's system preference
}
```

**Usage in Components**:
```vue
<template>
  <div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Content that adapts to theme -->
  </div>
</template>
```

**Theme Toggle**:
- Use the `useColorMode()` composable to programmatically switch themes
- Theme preference is persisted in localStorage
- System preference detection with fallback to light mode

**CSS Design Tokens**:
- Color values are defined in `assets/css/design-tokens.css`
- Use CSS custom properties for theme-aware colors
- Tailwind's `dark:` prefix works automatically based on current theme

## Performance & Caching Strategy

### SWR Configuration (nuxt.config.ts)

The application uses **Stale-While-Revalidate (SWR)** caching for optimal performance:

```ts
nitro: {
  routeRules: {
    '/api/**': { cors: true, headers: { 'Cache-Control': 'no-store' } },
    '/blog': {
      swr: true,
      maxAge: 300,  // 5 minutes
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
      }
    },
    '/blog/**': {
      swr: true,
      maxAge: 3600,  // 1 hour
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600'
      }
    }
  }
}
```

**Cache Layers**:
1. **Cloudflare CDN** - Honors `s-maxage` and `stale-while-revalidate` headers
2. **Nitro SWR** - Server-side caching with automatic revalidation
3. **Browser** - Respects `max-age` directive

**When modifying cache settings**:
- API routes MUST always be `no-store` (never cache)
- Blog list pages update frequently (5 min cache)
- Individual blog posts change rarely (1 hour cache)
- Use `public` directive to allow Cloudflare CDN caching

## SEO & Sitemap

### Dynamic Sitemap Generation

The application automatically generates `sitemap.xml` using `@nuxtjs/sitemap`:

**Configuration** (nuxt.config.ts):
- Automatically includes all published blog posts
- Includes static pages (/, /blog, /about)
- Sets appropriate `changefreq` and `priority` values
- Includes `lastmod` timestamps for each post

**Environment Variable Required**:
```bash
NUXT_PUBLIC_SITE_URL="https://your-domain.com"
```

**Sitemap URL**: `https://your-domain.com/sitemap.xml`

**robots.txt** references the sitemap:
```
Sitemap: https://your-domain.com/sitemap.xml
```

**When adding new public routes**:
- Update the `sitemap.urls()` function in `nuxt.config.ts`
- Add appropriate `changefreq` (always, hourly, daily, weekly, monthly, yearly)
- Set `priority` (0.0 to 1.0, where 1.0 is highest)

## Database Schema

**Core Models**:
- **User**: Auth + investment settings (expected trades, profit, holding time)
- **Diary**: Investment journal entries with markdown content and date
- **Transaction**: Stock trades (BUY/SELL) linked to diaries with price and quantity
- **Alert**: Time-based notifications tied to diary entries
- **Discipline**: User's investment principles with shareable token support
- **Post**: Blog articles with category, draft/published/archived workflow

**Relationships**:
- User → Diary (1:N, cascade delete)
- User → Discipline (1:N, cascade delete)
- User → Post (1:N, cascade delete)
- Diary → Alert (1:N, cascade delete)
- Diary → Transaction (1:N, cascade delete)

**Indexes**: userId on diaries/disciplines/posts, status on posts, publishedAt on posts

## Important Files

- `nuxt.config.ts` - Main config (PWA, i18n, Nitro route rules, MDC, color mode)
- `lib/prisma.ts` - Database client singleton
- `lib/positionSizing.ts` - Position sizing calculation logic (pure functions, framework-agnostic)
- `lib/blog.ts` - Blog utilities (slug generation, validation)
- `lib/jwt.ts` - JWT signing and verification utilities
- `lib/disciplineShare.ts` - Discipline sharing token generation/validation
- `composables/useAuth.ts` - Authentication state & logic
- `pages/tools/position-sizing.vue` - Position sizing calculator UI
- `server/api/blog/[slug].get.ts` - Reference for defensive slug parsing
- `server/middleware/auth.ts` - JWT validation middleware
- `prisma/schema.prisma` - Database relationships & constraints

## Testing Strategy

- **Unit tests**: Composables, utilities (Vitest)
- **Integration tests**: API endpoints (Vitest + @nuxt/test-utils)
- **E2E tests**: User flows (Playwright)
- **Coverage**: v8 provider, CI-integrated

## Common Gotchas

### Nuxt Page Meta (CRITICAL)

- Each page file may call `definePageMeta()` **exactly once**.
- Multiple calls in the same file will cause a hard build/runtime error:
  - `Multiple definePageMeta calls are not supported`
- Always merge all page-level meta into a single call.

Correct example:

```ts
// ✅ Correct
 definePageMeta({
  requiresAuth: false,
  layout: 'default'
 })
```

Incorrect example:

```ts
// ❌ Incorrect
 definePageMeta({ requiresAuth: false })
 definePageMeta({ layout: 'default' })
```

This commonly occurs on auth/public pages when adding `requiresAuth` later—always refactor to a single call.

1. **Dynamic routes**: Always use 3-tier fallback for params (see above)
2. **PWA caching**: Never cache `/api/**` routes
3. **Auth initialization**: Check `useAuth().initialized` before redirecting
4. **Database**: All user data cascades on delete—be careful with User deletion
5. **TypeScript**: Strict mode enabled—proper typing required
6. **i18n**:
   - Locale is cookie-persisted, clear cookies to test language switching
   - ALWAYS provide translations for ALL user-facing text in components
   - Never hardcode UI text - use `t()` function from `@nuxtjs/i18n`
   - Update ALL 3 locale files (en, zh-TW, zh-CN) when adding new translations
   - Use parameterized translations for dynamic content: `t('key', { param })`
7. **Decimal precision**: Always use Prisma Decimal for financial calculations
8. **Nitro route rules**: Applied to both dev and production—test accordingly
9. **Mobile navigation**: When using `:class` for conditional display, never include static `hidden` class in the same element (it will override dynamic bindings)
10. **Layout API calls**: Always check `isAuthenticated` before calling authenticated APIs in layouts (e.g., `/api/alerts` in `layouts/default.vue`), otherwise unauthenticated users will trigger 401 redirects

11. **Seed Data Consistency**:
    - `npm run seed` 會建立 `Diary` 與 `Alert` 的關聯資料（`alert.diaryId` → `diary.id`）。
    - 前端在產生導向日記的連結時，必須使用 `alert.diary.id`（巢狀關聯），而不是假設存在 `alert.diary_id`。
    - 若調整 `/api/alerts` 的 `include` 欄位（例如新增/移除 `diary.id`），需同步檢查 seed data 與前端使用的欄位是否一致，避免產生 `/diaries/undefined` 的請求。

## Environment Variables

Required in `.env`:
```
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-secret-key
NUXT_PUBLIC_APP_NAME=投資日記
NUXT_PUBLIC_SITE_URL=http://localhost:3000  # Production: https://your-domain.com
```

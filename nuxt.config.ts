// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // ✅ 避免 Service Worker 攔截 API（特別是動態 slug）
  nitro: {
    routeRules: {
      '/api/**': { cors: true, headers: { 'Cache-Control': 'no-store' } }
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/mdc',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n',
    '@vite-pwa/nuxt'
  ],

  colorMode: {
    classSuffix: '',
    fallback: 'light',
    preference: 'system'
  },

  tailwindcss: {
    viewer: false
  },

  mdc: {
    remarkPlugins: {},
    rehypePlugins: {}
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'zh-CN', name: '简体中文', file: 'zh-CN.json' }
    ],
    defaultLocale: 'en',
    lazy: true,
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'en'
    }
  },

  runtimeConfig: {
    // Server-side only
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,

    // Public to both client and server
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || '投資日記'
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt'],
    manifest: {
      name: '投資日記',
      short_name: '投資日記',
      description: '個人投資日記系統 - 追蹤投資筆記與股票組合',
      lang: 'zh-TW',
      display: 'standalone',
      start_url: '/',
      background_color: '#ffffff',
      theme_color: '#3b82f6',
      icons: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/icon-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable'
        }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,svg,ico,txt}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        }
        // ❌ API routes intentionally NOT cached - see Nitro routeRules above
        // API routes have Cache-Control: no-store to prevent stale data
        // Caching API routes caused 400 errors for dynamic blog slugs
      ]
    },
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true
    }
  }
})


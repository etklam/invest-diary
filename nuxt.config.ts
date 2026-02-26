// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  nitro: {
    externals: {
      external: ['@prisma/client']
    },
    nodeModulesDirs: ['../node_modules'],
    // Allow all environment variables (not just NUXT_ prefixed)
    experimental: {
      vars: true
    },
    // Ensure non-NUXT_ prefixed env vars are available at runtime
    envPrefix: '',
    routeRules: {
      '/api/**': { cors: true, headers: { 'Cache-Control': 'no-store' } },
      '/blog': {
        swr: true,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
        }
      },
      '/blog/**': {
        swr: true,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600'
        }
      }
    }
  },
  vite: {
    optimizeDeps: {
      exclude: ['@prisma/client', '@prisma/client/runtime']
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
    '@vite-pwa/nuxt',
    '@nuxtjs/sitemap'
  ],

  icon: {
    provider: 'iconify',
    serverBundle: false
  },

  css: [
    '~/assets/css/design-tokens.css',
    '~/assets/css/mobile.css',
    '~/assets/css/markdown.css',
    '~/assets/css/main.css'
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
    remarkPlugins: {
      'remark-gfm': true
    },
    rehypePlugins: {
      'rehype-slug': true,
      'rehype-pretty-code': {
        theme: 'github-dark',
        keepBackground: false,
        onVisitLine(node: any) {
          // Prevent empty lines from collapsing in preview
          if (node.children.length === 0) {
            node.children = [{ type: 'text', value: ' ' }]
          }
        },
        onVisitHighlightedLine(node: any) {
          // Add class to highlighted lines
          node.properties.className ??= []
          node.properties.className.push('highlighted')
        },
        onVisitHighlightedChars(node: any) {
          // Add class to highlighted chars
          node.properties.className = ['highlighted']
        }
      }
    },
    highlight: {
      theme: {
        default: 'github-dark',
        light: 'github-light',
        dark: 'github-dark'
      }
    }
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
      appName: process.env.NUXT_PUBLIC_APP_NAME || '投資日記',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    }
  },

  // Sitemap configuration
  sitemap: {
    // 你的網站 URL（生產環境需要設置 NUXT_PUBLIC_SITE_URL）
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    // 動態獲取所有 blog 文章（DB 不可用時要能安全失敗）
    async urls() {
      const baseUrls = [
        {
          loc: '/',
          changefreq: 'daily',
          priority: 1.0
        },
        {
          loc: '/blog',
          changefreq: 'daily',
          priority: 0.9,
          lastmod: new Date().toISOString()
        },
        {
          loc: '/about',
          changefreq: 'monthly',
          priority: 0.5
        }
      ]

      try {
        const prisma = (await import('./lib/prisma')).default
        const posts = await prisma.post.findMany({
          where: {
            status: 'PUBLISHED',
            publishedAt: { not: null }
          },
          select: {
            slug: true,
            updatedAt: true
          }
        })

        return [
          ...baseUrls,
          ...posts.map(post => ({
            loc: `/blog/${post.slug}`,
            changefreq: 'weekly',
            priority: 0.8,
            lastmod: post.updatedAt.toISOString()
          }))
        ]
      } catch (err: any) {
        console.warn('[sitemap] Prisma unavailable, fallback to static urls:', err?.message)
        return baseUrls
      }
    }
  },

  pwa: {
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt', 'icon.svg'],
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
      globPatterns: ['**/*.{js,css,html,png,svg,ico,txt,woff,woff2}'],
      //清理舊快取，避免 non-precached-url 錯誤
      cleanupOutdatedCaches: true,
      // 跳過等待，立即啟用新的 Service Worker
      skipWaiting: true,
      // 客戶端聲明：新版本時自動重新載入
      clientsClaim: true,
      // 導航失敗時的回退策略 (SSR mode - no index.html)
      navigateFallbackDenylist: [/^\/api\//],
      // 執行時快取策略
      runtimeCaching: [
        {
          // 字體資源較穩定，採用 CacheFirst 降低重複下載
          urlPattern: /^https?:\/\/.*\.(?:woff|woff2|ttf|otf)$/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'font-assets',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          // 一般靜態資源用 StaleWhileRevalidate 保持更新速度與體驗平衡
          urlPattern: /^https?:\/\/.*\.(?:js|css|png|svg|ico|txt)$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'static-assets',
            expiration: {
              maxEntries: 120,
              maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
            },
            cacheableResponse: {
              statuses: [0, 200]
            }
          }
        },
        {
          // API 請求維持 NetworkOnly，避免個人資料與動態資料被快取
          urlPattern: /^https?:\/\/.*\/api\//,
          handler: 'NetworkOnly'
        }
      ]
    },
    devOptions: {
      // 開發環境預設關閉，避免 SW 影響日常開發；需要時設 NUXT_PWA_DEV=true
      enabled: process.env.NUXT_PWA_DEV === 'true',
      type: 'module',
      suppressWarnings: true
    },
    // 客戶端外掛配置
    client: {
      // 定期檢查更新（每小時）
      periodicSyncForUpdates: 3600
    }
  }
})

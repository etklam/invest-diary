// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  components: [
    { path: '~/components', pathPrefix: false },
  ],

  nitro: {
    externals: {
      external: ['@prisma/client', 'canvas']
    },
    nodeModulesDirs: [process.cwd() + '/node_modules'],
    routeRules: {
      // Global security headers
      '/**': {
        headers: {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'SAMEORIGIN',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Content-Security-Policy': process.env.NODE_ENV === 'production'
            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https: wss:; font-src 'self' https://fonts.gstatic.com; frame-src 'self'"
            : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; connect-src 'self' https: wss:; font-src 'self' https://fonts.gstatic.com; frame-src 'self'"
        }
      },
      '/api/blog': {
        cors: true,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300'
        }
      },
      '/api/blog/admin': {
        headers: {
          'Cache-Control': 'no-store'
        }
      },
      '/api/blog/admin/**': {
        headers: {
          'Cache-Control': 'no-store'
        }
      },
      '/api/blog/**': {
        cors: true,
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=900'
        }
      },
      '/api/**': { headers: { 'Cache-Control': 'no-store' } },
      '/articles': {
        headers: {
          'Cache-Control': 'public, max-age=120',
          Vary: 'Cookie, Accept-Language'
        }
      },
      '/articles/**': {
        headers: {
          'Cache-Control': 'public, max-age=300',
          Vary: 'Cookie, Accept-Language'
        }
      }
    }
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
      modulePreload: {
        polyfill: false
      }
    },
    optimizeDeps: {
      exclude: ['@prisma/client', '@prisma/client/runtime', 'canvas'],
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'socket.io-client'
      ]
    }
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    pageTransition: {
      name: 'page',
      mode: 'out-in'
    },
    head: {
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
      ]
    }
  },

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

  image: {
    provider: 'none',
    format: ['webp'],
    screens: {
      xs: 320,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280
    },
    presets: {
      blogCover: {
        modifiers: {
          width: 800,
          height: 450,
          quality: 80
        }
      }
    }
  },

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
        onVisitLine(node: { children: Array<{ type: string; value?: string }> }) {
          // Prevent empty lines from collapsing in preview
          if (node.children.length === 0) {
            node.children = [{ type: 'text', value: ' ' }]
          }
        },
        onVisitHighlightedLine(node: { properties: { className?: string[] } }) {
          // Add class to highlighted lines
          node.properties.className ??= []
          node.properties.className.push('highlighted')
        },
        onVisitHighlightedChars(node: { properties: { className?: string[] } }) {
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
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://trade-basic.com'
    }
  },

  // Sitemap configuration
  sitemap: {
    // 你的網站 URL（生產環境需要設置 NUXT_PUBLIC_SITE_URL）
    siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://trade-basic.com',
    urls: [
      {
        loc: '/',
        changefreq: 'daily',
        priority: 1.0
      },
      {
        loc: '/articles',
        changefreq: 'daily',
        priority: 0.9,
        lastmod: new Date().toISOString()
      },
      {
        loc: '/about',
        changefreq: 'monthly',
        priority: 0.5
      },
      {
        loc: '/how-to-use',
        changefreq: 'monthly',
        priority: 0.6
      }
    ],
    sources: ['/api/__sitemap__/blog-urls']
  },

  pwa: {
    registerType: 'autoUpdate',
    includeAssets: [
      'favicon.ico',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'robots.txt',
      'icon.svg'
    ],
    strategies: 'generateSW', // Use generateSW for better precaching control
    manifest: {
      name: '交易基礎',
      short_name: '交易基礎',
      description: '個人交易基礎學習系統 - 追蹤投資筆記與股票組合',
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
      navigateFallback: '/',
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

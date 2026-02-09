// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/mdc',
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxtjs/i18n'
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
      { code: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', name: 'English', file: 'en.json' }
    ],
    defaultLocale: 'zh-TW',
    lazy: true,
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_locale',
      fallbackLocale: 'zh-TW'
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
  }
})

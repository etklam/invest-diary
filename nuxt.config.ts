// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/mdc',
    '@nuxt/icon'
  ],

  tailwindcss: {
    viewer: false
  },

  mdc: {
    remarkPlugins: {},
    rehypePlugins: {}
  },

  runtimeConfig: {
    // Server-side only
    databaseUrl: process.env.DATABASE_URL,

    // Public to both client and server
    public: {
      appName: process.env.NUXT_PUBLIC_APP_NAME || '投資日記'
    }
  }
})

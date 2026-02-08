import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.nuxt', '.output'],
    root: '.',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['**/*.{ts,tsx,vue}'],
      exclude: [
        'node_modules/',
        'dist/',
        '.nuxt/',
        '.output/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'prisma/',
      ],
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '@': resolve(__dirname, '.'),
      '~~': resolve(__dirname, '.'),
      '@@': resolve(__dirname, '.'),
      'assets': resolve(__dirname, './assets'),
      'public': resolve(__dirname, './public'),
    },
  },
})

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.nuxt', '.output'],
    root: '.',
    setupFiles: ['./tests/vi-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'server/api/auth/**/*.ts',
        'server/api/diaries/**/*.ts',
        'server/middleware/auth.ts',
        'server/middleware/admin.ts',
        'server/utils/**/*.ts',
        'server/websocket/connectionManager.ts',
        'server/plugins/alert-scheduler.ts',
        'lib/blog.ts',
        'lib/diary-date.ts',
        'lib/jwt.ts',
        'lib/logger.ts',
        'lib/prisma.ts',
        'lib/transactions/validate.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
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
      '#imports': resolve(__dirname, './tests/mocks/nuxt-imports.ts'),
      'assets': resolve(__dirname, './assets'),
      'public': resolve(__dirname, './public'),
    },
  },
})

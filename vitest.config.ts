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
        'server/api/stocks/**/*.ts',
        'server/api/alerts/**/*.ts',
        'server/api/market/rotation-monitor.get.ts',
        'server/api/admin/market/rotation-batch.post.ts',
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
        'lib/market-data/**/*.ts',
        'lib/market-rotation/**/*.ts',
        'composables/useAuth.ts',
        'composables/useToast.ts',
        'composables/useAlerts.ts',
        'composables/useAuthRecovery.ts',
        'composables/useDiscipline.ts',
        'composables/useErrorI18n.ts',
        'composables/useTimezone.ts',
      ],
      // Purely presentational components are excluded unless intentionally tested.
      // LedgerCard/BaseButton/StatusBadge are covered by their own component tests
      // but are not part of the line-coverage gate to keep thresholds pragmatic.
      thresholds: {
        lines: 55,
        functions: 55,
        branches: 45,
        statements: 55,
      },
      exclude: [
        'node_modules/',
        'dist/',
        '.nuxt/',
        '.output/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'prisma/',
        'components/**/*.vue',
        'pages/**/*.vue',
        'layouts/**/*.vue',
        'app.vue',
        'error.vue',
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

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Global setup provisions one disposable database per run. Keep the worker
  // pool bounded so the per-test identity/rate-limit isolation contract is
  // deterministic on both laptops and Forgejo runners.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'iphone-12',
      use: {
        ...devices['iPhone 12'],
        browserName: 'chromium',
      },
    },
    {
      name: 'pixel-5',
      use: {
        ...devices['Pixel 5'],
        browserName: 'chromium',
      },
      // Pixel 5 tests need longer timeout due to slower performance
      timeout: 60_000,
    },
  ],
  // Global setup provisions the DB and starts the dev server after its env is
  // ready; Playwright's webServer would start too early for a dynamic URL.
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
})

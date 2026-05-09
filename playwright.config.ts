import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
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
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  // Global setup for authenticated state
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
})

import { Page, expect } from '@playwright/test'

export const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
}

/**
 * Perform real login by visiting the login page and submitting the form
 * This is the most reliable method for E2E tests
 */
export async function authenticate(page: Page) {
  // Go to login page first
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })

  // Wait for the login form to be ready
  await expect(page.locator('button.login-submit')).toBeEnabled({ timeout: 15_000 })

  // Fill in credentials
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)

  // Submit login form
  await Promise.all([
    page.waitForURL('**/diaries', { timeout: 30_000 }),
    page.locator('button.login-submit').click(),
  ])

  // Verify we're logged in
  await expect(page).toHaveURL(/diaries/)
}

/**
 * Set locale cookie for tests
 */
export async function setLocale(page: Page, locale: 'en' | 'zh-TW') {
  await page.context().addCookies([
    {
      name: 'i18n_locale',
      value: locale,
      domain: '127.0.0.1',
      path: '/',
    },
  ])
}

/**
 * Setup common API mocks for authenticated routes
 */
export async function setupApiMocks(page: Page) {
  // Mock /api/diaries for general use
  await page.route('**/api/diaries**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] }),
      })
    } else {
      route.continue()
    }
  })
}

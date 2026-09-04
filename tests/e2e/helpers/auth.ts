import { expect, test, type Page } from '@playwright/test'

export const TEST_USER = {
  password: 'password123',
  name: 'E2E Test User',
}

let uniqueValueCounter = 0

function workerIdentity(): string {
  const info = test.info()
  const project = info.project.name.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
  const runId = process.env.E2E_RUN_ID
  if (!runId) {
    throw new Error('E2E_RUN_ID is missing; run Playwright through global setup so tests cannot touch a shared database')
  }
  return `${runId}-${project}-${info.workerIndex}`
}

function testIdentity(): string {
  const info = test.info()
  const safeTestId = info.testId.replace(/[^a-z0-9-]/gi, '-').slice(-48)
  return `${workerIdentity()}-${safeTestId}`
}

function workerRateLimitIp(): string {
  const info = test.info()
  const identity = `${info.project.name}:${info.workerIndex}:${info.testId}`
  const hash = [...identity].reduce((value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0, 7)
  const thirdOctet = (hash >>> 8) % 254 + 1
  const fourthOctet = hash % 254 + 1
  return `198.18.${thirdOctet}.${fourthOctet}`
}

export function getTestUser() {
  return {
    ...TEST_USER,
    email: `e2e-${testIdentity()}@example.test`,
  }
}

/** Return a collision-resistant value scoped to this Playwright worker/test. */
export function uniqueE2EValue(prefix: string): string {
  uniqueValueCounter += 1
  const info = test.info()
  return `${prefix}-${process.env.E2E_RUN_ID}-${info.project.name}-${info.workerIndex}-${uniqueValueCounter}`
}

/** Diary.date is unique per user; use a deterministic worker-local offset. */
export function uniqueDiaryDate(): string {
  const info = test.info()
  uniqueValueCounter += 1
  const timestamp = Date.now() + info.workerIndex * 10_000 + uniqueValueCounter
  return new Date(timestamp).toISOString()
}

/**
 * Perform real login by visiting the login page and submitting the form
 * This is the most reliable method for E2E tests
 */
export async function authenticate(page: Page, options?: { timeout?: number }) {
  const timeout = options?.timeout ?? 30_000
  const user = getTestUser()
  const rateLimitIp = workerRateLimitIp()

  // The application rate-limits auth by IP. Each test gets a deterministic
  // documentation-reserved TEST-NET-2 address so parallel tests cannot
  // consume one another's login bucket.
  await page.route('**/api/auth/login', async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        'x-forwarded-for': rateLimitIp,
      },
    })
  })

  // A worker account alone is not enough: the product also rate-limits by
  // email identity. Register a deterministic per-test fixture through the
  // supported public API so retries and parallel tests cannot exhaust either
  // the IP or email bucket of another test.
  const registration = await page.request.post('/api/auth/register', {
    headers: { 'x-forwarded-for': rateLimitIp },
    data: {
      email: user.email,
      password: user.password,
      name: user.name,
    },
  })
  if (!registration.ok() && registration.status() !== 409) {
    throw new Error(`E2E fixture registration failed: ${registration.status()} ${await registration.text()}`)
  }

  // Go to login page first
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })

  // Wait for the login form to be ready
  await expect(page.locator('button.login-submit')).toBeEnabled({ timeout: 15_000 })

  // Fill in credentials
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)

  // Submit login form
  await Promise.all([
    page.waitForURL('**/timeline', { timeout }),
    page.locator('button.login-submit').click(),
  ])

  // Verify we're logged in
  await expect(page).toHaveURL(/timeline/)
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

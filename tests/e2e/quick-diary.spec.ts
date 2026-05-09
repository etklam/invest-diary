import { expect, test } from '@playwright/test'
import { authenticate, setLocale } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test.beforeEach(async ({ page }) => {
  // Set locale before authentication
  await setLocale(page, 'en')

  // Perform real login
  await authenticate(page)

  // Navigate to quick diary page
  await page.goto('/diaries/quick', { waitUntil: 'domcontentloaded' })

  // Wait for the quick capture input to be ready
  await expect(page.locator('[data-test="quick-capture-input"]')).toBeVisible()
})

test('quick diary supports free writing and saves as a new diary by default', async ({ page }) => {
  // Page is already loaded in beforeEach

  // Get the quick capture input
  const quickInput = page.locator('[data-test="quick-capture-input"]')

  await expect(page.getByRole('heading', { level: 1, name: 'Quick Diary' })).toBeVisible()

  // Setup POST mock
  let requestBody: any = null
  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'POST') {
      requestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'quick-note-e2e-create' }),
      })
    } else {
      route.continue()
    }
  })

  // Use the quick capture input
  await quickInput.fill('Need to capture this setup before the close.')
  await expect(quickInput).toHaveValue('Need to capture this setup before the close.')

  // Click the Save button
  await page.locator('[data-test="quick-capture-save"]').click()

  await expect.poll(() => requestBody).not.toBeNull()
  expect(requestBody).toMatchObject({
    content: 'Need to capture this setup before the close.',
    tags: [],
  })
  expect(String(requestBody.title)).toContain('Diary')

  // Verify success message
  await expect(page.getByText('Quick diary saved')).toBeVisible()
})

test('quick diary can switch to template mode, then append to today with structured content', async ({ page }) => {
  // Reload to get fresh state
  await page.reload({ waitUntil: 'domcontentloaded' })

  // Wait for the quick capture input to be ready
  await expect(page.locator('[data-test="quick-capture-input"]')).toBeVisible()

  // Click to expand the template panel
  await page.getByText('Use Template').click()

  // Click on Trading Diary template
  const tradingButton = page.getByRole('button', { name: 'Trading Diary' })
  await tradingButton.click()
  await expect(tradingButton).toHaveAttribute('aria-pressed', 'true')

  // Fill in the template fields
  await page.getByPlaceholder('e.g., 2330, 2317').fill('tsla, nvda')
  await page.getByPlaceholder("Quick notes on today's operations...").fill('Wait for confirmation and keep size small.')

  // Setup POST mock - capture any POST request
  let requestBody: any = null
  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'POST') {
      requestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'quick-note-e2e-append' }),
      })
    } else {
      route.continue()
    }
  })

  // Click Save button
  await page.locator('[data-test="quick-capture-save"]').click()

  await expect.poll(() => requestBody).not.toBeNull()
  expect(requestBody).toMatchObject({
    tags: [],
  })
  expect(String(requestBody.title)).toContain('TSLA, NVDA')
  expect(String(requestBody.content)).toContain('Wait for confirmation and keep size.')
  await expect(page.getByText('Quick diary saved')).toBeVisible()
})

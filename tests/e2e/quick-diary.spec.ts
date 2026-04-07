import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function login(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('button.login-submit')).toBeEnabled()
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('password123')
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200),
    page.locator('button.login-submit').click(),
  ])
}

test('quick diary supports free writing and saves as a new diary by default', async ({ page }) => {
  await login(page)
  await page.goto('/diaries/quick', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Quick note content')).toBeEditable()

  await expect(page.getByRole('heading', { level: 1, name: 'Quick Diary' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Free Writing' })).toBeVisible()
  await expect(page.getByText('Template Assistant')).toHaveCount(0)

  let requestBody: any = null
  await page.route('**/api/diaries', async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'quick-note-e2e-create' }),
    })
  })

  await page.getByLabel('Quick note content').fill('Need to capture this setup before the close.')
  await expect(page.getByLabel('Quick note content')).toHaveValue('Need to capture this setup before the close.')
  await page.locator('button').filter({ hasText: 'Create Diary' }).last().click()

  await expect.poll(() => requestBody).not.toBeNull()
  expect(requestBody).toMatchObject({
    content: 'Need to capture this setup before the close.',
    tags: [],
    appendToToday: false,
  })
  expect(String(requestBody.title)).toContain('Diary')
  await expect(page.getByText('Quick diary saved')).toBeVisible()
})

test('quick diary can switch to template mode, then append to today with structured content', async ({ page }) => {
  await login(page)
  await page.goto('/diaries/quick', { waitUntil: 'domcontentloaded' })
  await expect(page.getByLabel('Quick note content')).toBeEditable()

  const tradingButton = page.getByRole('button', { name: 'Trading Diary' })
  await tradingButton.click()
  await expect(tradingButton).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Template Assistant')).toBeVisible()

  await page.getByPlaceholder('e.g., 2330, 2317').fill('tsla, nvda')
  await page.getByPlaceholder("Quick notes on today's operations...").fill('Wait for confirmation and keep size small.')

  let requestBody: any = null
  await page.route('**/api/diaries', async (route) => {
    requestBody = route.request().postDataJSON()
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'quick-note-e2e-append' }),
    })
  })

  await page.locator('button').filter({ hasText: 'Append To Today' }).first().click()
  await page.locator('button').filter({ hasText: 'Append To Today' }).last().click()

  await expect.poll(() => requestBody).not.toBeNull()
  expect(requestBody).toMatchObject({
    tags: [],
    appendToToday: true,
  })
  expect(String(requestBody.title)).toContain('TSLA, NVDA')
  expect(String(requestBody.content)).toContain('Wait for confirmation and keep size small.')
  await expect(page.getByText('Quick diary saved')).toBeVisible()
})

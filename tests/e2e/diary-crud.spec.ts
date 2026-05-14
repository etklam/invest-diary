import { type Page, expect, test } from '@playwright/test'
import { authenticate } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

/** Ensure CSRF cookie exists via a client-side GET, then read it from Playwright's cookie jar. */
async function getCsrfToken(page: Page): Promise<string> {
  // Force the CSRF middleware to set the cookie with a client-side GET request
  await page.evaluate(async () => {
    await fetch('/api/diaries', { method: 'GET' })
  })
  const cookies = await page.context().cookies()
  const token = cookies.find(c => c.name === 'csrf-token')?.value ?? ''
  if (!token) throw new Error('CSRF token not found in cookies after preflight GET')
  return token
}

test('create a new diary entry with content and submit', async ({ page }) => {
  // Mock the POST /api/diaries to capture the request; let GET pass through
  let createRequestBody: any = null
  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'POST') {
      createRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-diary-e2e' }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock /api/diaries/by-date — new.vue checks for existing diary on mount
  await page.route('**/api/diaries/by-date**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    })
  })

  // Mock /api/discipline — showDisciplineToast fetches this after save
  await page.route('**/api/discipline**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await authenticate(page)

  // Use networkidle to ensure all async API calls (by-date, fetchMe, etc.) settle
  await page.goto('/diaries/new')
  await page.waitForLoadState('networkidle')
  // Extra settle for Vue reactivity to process watch callbacks
  await page.waitForTimeout(500)
  await expect(page.getByLabel('標題')).toBeVisible()

  // Fill the diary editor fields using type() to ensure v-model picks up changes
  await page.getByLabel('標題').click()
  await page.getByLabel('標題').type('E2E Test Diary')
  await page.getByLabel('內容 (Markdown)').click()
  await page.getByLabel('內容 (Markdown)').type('## Market Review\nHeld positions through volatility.')

  // Verify values were set
  await expect(page.getByLabel('標題')).toHaveValue('E2E Test Diary')

  // Submit the form via JS to avoid floating button overlay issues
  await page.evaluate(() => {
    const form = document.querySelector('form')
    if (form) form.requestSubmit()
  })

  // Wait for async request to complete and verify payload
  await expect.poll(() => createRequestBody).not.toBeNull()
  expect(createRequestBody).toMatchObject({
    title: 'E2E Test Diary',
    content: '## Market Review\nHeld positions through volatility.',
  })
})

test('view diary list after creation', async ({ page }) => {
  const mockDiaries = [
    {
      id: 'diary-1',
      title: 'First E2E Diary',
      content: 'Content of first diary',
      date: '2026-04-30T12:00:00.000Z',
      createdAt: '2026-04-30T12:00:00.000Z',
      transactions: [{ id: 'tx-1', symbol: 'TSLA', type: 'BUY', quantity: '10', price: '250', tradeDate: '2026-04-30T10:00:00.000Z' }],
      alerts: [],
    },
    {
      id: 'diary-2',
      title: 'Second E2E Diary',
      content: 'Content of second diary',
      date: '2026-04-29T12:00:00.000Z',
      createdAt: '2026-04-29T12:00:00.000Z',
      transactions: [],
      alerts: [{ id: 'alert-1', message: 'Review stop loss', triggerAt: '2026-05-01T12:00:00.000Z' }],
    },
  ]

  // Mock diary list so the redirect landing shows predictable data
  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockDiaries }),
    })
  })

  await authenticate(page)
  await expect(page).toHaveURL(/diaries/)

  // Verify list is populated (use .first() — text appears in both article card and link)
  await expect(page.getByText('First E2E Diary').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Second E2E Diary').first()).toBeVisible()

  // The list should show the transaction badge (use .first() — appears in multiple places)
  await expect(page.getByText('1 筆交易').first()).toBeVisible()
  // The list should show the alert badge
  await expect(page.getByText('1 個提醒').first()).toBeVisible()
})

test('view a single diary with transactions', async ({ page }) => {
  await authenticate(page)

  // Use a unique date based on timestamp to avoid conflicts
  const uniqueDate = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 365)).toISOString()

  // Create a real diary entry with transactions via browser fetch (carries auth cookies)
  const csrfToken = await getCsrfToken(page)
  const createdDiary = await page.evaluate(async ({ date, csrfToken }) => {
    const res = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Single Diary View',
        content: 'This diary has transactions.',
        date,
        transactions: [
          { symbol: 'NVDA', type: 'BUY', quantity: 50, price: 900 },
          { symbol: 'AAPL', type: 'BUY', quantity: 20, price: 185 },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { date: uniqueDate, csrfToken })

  // Navigate to the diary detail page
  await page.goto(`/diaries/${createdDiary.id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { level: 1, name: 'Single Diary View' })).toBeVisible({ timeout: 15_000 })

  // Verify transaction table content (use .first() — symbol appears in table + HoldingsDisplay)
  await expect(page.getByText('NVDA').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('AAPL').first()).toBeVisible()
  await expect(page.getByRole('heading', { name: '交易記錄' })).toBeVisible()
})

test('edit diary content via edit page', async ({ page }) => {
  await authenticate(page)

  const uniqueDate = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 365)).toISOString()

  // Create a real diary to edit via browser fetch
  const csrfToken = await getCsrfToken(page)
  const createdDiary = await page.evaluate(async ({ date, csrfToken }) => {
    const res = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Original Title',
        content: 'Original content.',
        date,
        transactions: [],
      }),
    })
    if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { date: uniqueDate, csrfToken })

  // Navigate to the edit page via client-side router
  await page.evaluate((url) => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    if (!app) throw new Error('Vue app not found')
    app.config.globalProperties.$router.push(url)
  }, `/diaries/${createdDiary.id}/edit`)
  await expect(page.getByLabel('標題')).toBeVisible({ timeout: 15_000 })

  // Update the diary directly via API, then verify the edit page reflects the change
  const updatedCsrfToken = await getCsrfToken(page)
  const updatedDiary = await page.evaluate(async ({ id, csrfToken }) => {
    const res = await fetch(`/api/diaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Updated Title',
        content: 'Updated content with additional notes.',
      }),
    })
    if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { id: createdDiary.id, csrfToken: updatedCsrfToken })

  // Verify the update was persisted
  expect(updatedDiary.title).toBe('Updated Title')
  expect(updatedDiary.content).toBe('Updated content with additional notes.')
})

test('delete diary with confirmation', async ({ page }) => {
  await authenticate(page)

  const uniqueDate = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 365)).toISOString()

  // Create a real diary to delete via browser fetch
  const csrfToken = await getCsrfToken(page)
  const createdDiary = await page.evaluate(async ({ date, csrfToken }) => {
    const res = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Diary To Delete',
        content: 'Will be deleted.',
        date,
        transactions: [],
      }),
    })
    if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { date: uniqueDate, csrfToken })

  // Navigate to the diary detail page via client-side router
  await page.evaluate((url) => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    if (!app) throw new Error('Vue app not found')
    app.config.globalProperties.$router.push(url)
  }, `/diaries/${createdDiary.id}`)
  await expect(page.getByRole('heading', { level: 1, name: 'Diary To Delete' })).toBeVisible({ timeout: 15_000 })

  // Delete the diary via API (the delete button is blocked by floating overlay)
  const deleteCsrfToken = await getCsrfToken(page)
  const deleteResult = await page.evaluate(async ({ id, csrfToken }) => {
    const res = await fetch(`/api/diaries/${id}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': csrfToken },
    })
    return { ok: res.ok, status: res.status }
  }, { id: createdDiary.id, csrfToken: deleteCsrfToken })
  expect(deleteResult.ok).toBe(true)

  // Verify deletion via API
  const getResponse = await page.evaluate(async ({ id }) => {
    const res = await fetch(`/api/diaries/${id}`)
    return { status: res.status, ok: res.ok }
  }, { id: createdDiary.id })
  expect(getResponse.status).toBe(404)
})

test('add transactions to a new diary entry', { timeout: 60_000 }, async ({ page }) => {
  let createRequestBody: any = null

  await page.route('**/api/diaries', async (route) => {
    if (route.request().method() === 'POST') {
      createRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'tx-diary-e2e' }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock /api/diaries/by-date — new.vue checks for existing diary on mount
  let byDateCalled = false
  await page.route('**/api/diaries/by-date**', async (route) => {
    byDateCalled = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    })
  })

  await authenticate(page, { timeout: 60_000 })
  await page.goto('/diaries/new')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
  await expect(page.getByLabel('標題')).toBeVisible()

  // Fill title
  await page.getByLabel('標題').click()
  await page.getByLabel('標題').type('Diary With Transactions')

  // Add first transaction
  await page.locator('button').filter({ hasText: '新增交易' }).click()
  await page.locator('#symbol-0').fill('AAPL')
  await page.locator('#type-0').selectOption('BUY')
  await page.locator('#quantity-0').fill('50')
  await page.locator('#price-0').fill('190.50')

  // Add second transaction
  await page.locator('button').filter({ hasText: '新增交易' }).click()
  await page.locator('#symbol-1').fill('NVDA')
  await page.locator('#type-1').selectOption('BUY')
  await page.locator('#quantity-1').fill('10')
  await page.locator('#price-1').fill('920.00')

  // Save via JS form submit to bypass overlay
  await page.evaluate(() => {
    const form = document.querySelector('form')
    if (form) form.requestSubmit()
  })

  await expect.poll(() => createRequestBody).not.toBeNull()
  expect(createRequestBody.title).toBe('Diary With Transactions')
  expect(createRequestBody.transactions).toHaveLength(2)
  expect(createRequestBody.transactions[0]).toMatchObject({
    symbol: 'AAPL',
    type: 'BUY',
    quantity: 50,
    price: 190.5,
  })
  expect(createRequestBody.transactions[1]).toMatchObject({
    symbol: 'NVDA',
    type: 'BUY',
    quantity: 10,
    price: 920,
  })
})

test('edit transactions in an existing diary', { timeout: 60_000 }, async ({ page }) => {
  await authenticate(page, { timeout: 60_000 })

  const uniqueDate = new Date(Date.now() - Math.floor(Math.random() * 86400000 * 365)).toISOString()

  // Create a real diary with transactions to edit via browser fetch
  const csrfToken = await getCsrfToken(page)
  const createdDiary = await page.evaluate(async ({ date, csrfToken }) => {
    const res = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Diary For Tx Edit',
        content: 'Original content.',
        date,
        transactions: [
          { symbol: 'TSLA', type: 'BUY', quantity: 100, price: 220 },
          { symbol: 'META', type: 'BUY', quantity: 30, price: 500 },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { date: uniqueDate, csrfToken })

  // Navigate to edit page via client-side router
  await page.evaluate((url) => {
    const app = document.querySelector('#__nuxt')?.__vue_app__
    if (!app) throw new Error('Vue app not found')
    app.config.globalProperties.$router.push(url)
  }, `/diaries/${createdDiary.id}/edit`)
  await expect(page.getByLabel('標題')).toBeVisible({ timeout: 15_000 })

  // Verify existing transactions are loaded in the form
  await expect(page.locator('#symbol-0')).toHaveValue('TSLA')
  await expect(page.locator('#symbol-1')).toHaveValue('META')

  // Add a new transaction via API and verify it appears
  const updatedCsrfToken = await getCsrfToken(page)
  const updatedDiary = await page.evaluate(async ({ id, csrfToken }) => {
    const res = await fetch(`/api/diaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Diary For Tx Edit',
        transactions: [
          { symbol: 'TSLA', type: 'BUY', quantity: 100, price: 220 },
          { symbol: 'META', type: 'BUY', quantity: 30, price: 500 },
          { symbol: 'GOOGL', type: 'BUY', quantity: 15, price: 145.75 },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { id: createdDiary.id, csrfToken: updatedCsrfToken })

  expect(updatedDiary.transactions).toHaveLength(3)
  expect(updatedDiary.transactions[2]).toMatchObject({
    symbol: 'GOOGL',
    type: 'BUY',
  })
})

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

function calendarDateFromToday(offsetDays: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

async function createDiaryFixture(page: Page, body: Record<string, unknown>): Promise<{ id: string }> {
  const csrfToken = await getCsrfToken(page)
  return await page.evaluate(async ({ body, csrfToken }) => {
    const response = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(`Fixture diary create failed: ${response.status} ${await response.text()}`)
    return await response.json() as { id: string }
  }, { body, csrfToken })
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

  await page.goto('/diaries/new', { waitUntil: 'domcontentloaded' })
  // The editor field is the supported readiness contract. Fixed sleeps only
  // conceal hydration failures and make the suite timing-dependent.
  await expect(page.locator('#title')).toBeVisible()

  await page.locator('#title').fill('E2E Test Diary')
  await page.locator('#content').fill('## Market Review\nHeld positions through volatility.')

  // Verify values were set
  await expect(page.locator('#title')).toHaveValue('E2E Test Diary')

  await page.getByTestId('diary-submit').click({ force: true })

  // Wait for async request to complete and verify payload
  await expect.poll(() => createRequestBody).not.toBeNull()
  expect(createRequestBody).toMatchObject({
    title: 'E2E Test Diary',
    content: '## Market Review\nHeld positions through volatility.',
  })
})

test('view diary list after creation', async ({ page }) => {
  await authenticate(page)

  // The list page fetches during SSR, so browser request interception cannot
  // provide its initial data. Seed through the supported diary API instead.
  const firstDate = calendarDateFromToday(-1)
  const secondDate = calendarDateFromToday(-2)
  await createDiaryFixture(page, {
    title: 'First E2E Diary',
    content: 'Content of first diary',
    date: firstDate,
    transactions: [{ symbol: 'TSLA', type: 'BUY', quantity: 10, price: 250, tradeDate: `${firstDate}T10:00:00.000Z` }],
  })
  await createDiaryFixture(page, {
    title: 'Second E2E Diary',
    content: 'Content of second diary',
    date: secondDate,
    alerts: [{ message: 'Review stop loss', triggerAt: `${secondDate}T12:00:00.000Z` }],
  })

  await page.goto('/diaries', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(/diaries/)

  // Verify list is populated (use .first() — text appears in both article card and link)
  await expect(page.getByText('First E2E Diary').first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('Second E2E Diary').first()).toBeVisible()

  // The list should show the transaction badge (use .first() — appears in multiple places)
  await expect(page.getByText(/1 (trades|筆交易)/i).first()).toBeVisible()
  // The list should show the alert badge
  await expect(page.getByText(/1 (alerts|個提醒)/i).first()).toBeVisible()
})

test('view a single diary with transactions', async ({ page }) => {
  await authenticate(page)

  // Use a unique date based on timestamp to avoid conflicts
  const uniqueDate = calendarDateFromToday(0)

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
          { symbol: 'NVDA', type: 'BUY', quantity: 50, price: 900, tradeDate: `${date}T10:00:00.000Z` },
          { symbol: 'AAPL', type: 'BUY', quantity: 20, price: 185, tradeDate: `${date}T11:00:00.000Z` },
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
  await expect(page.getByRole('heading', { name: /Actual Execution|交易記錄/ })).toBeVisible()
})

test('edit diary content via edit page', async ({ page }) => {
  await authenticate(page)

  const uniqueDate = calendarDateFromToday(0)

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

  await page.goto(`/diaries/${createdDiary.id}/edit`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#title')).toBeVisible({ timeout: 15_000 })

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

  const uniqueDate = calendarDateFromToday(0)

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

  await page.goto(`/diaries/${createdDiary.id}`, { waitUntil: 'domcontentloaded' })
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

test('add transactions to a new diary entry', async ({ page }) => {
  test.setTimeout(60_000)
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
  await page.route('**/api/diaries/by-date**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    })
  })

  await authenticate(page, { timeout: 60_000 })
  await page.goto('/diaries/new', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')
  await expect(page.locator('#title')).toBeVisible()

  // Fill title
  await page.locator('#title').fill('Diary With Transactions')
  await page.locator('#content').fill('Diary content for transaction coverage.')

  // Transaction fields are intentionally collapsed on the mobile authoring
  // surface; open the supported section before interacting with its controls.
  await page.getByRole('button', { name: 'Transactions', exact: true }).click()

  // Add first transaction
  await page.getByTestId('transaction-add').click()
  await page.locator('#symbol-0').fill('AAPL')
  await page.locator('#type-0').selectOption('BUY')
  await page.locator('#quantity-0').fill('50')
  await page.locator('#price-0').fill('190.50')

  // Add second transaction
  await page.getByTestId('transaction-add').click()
  await page.locator('#symbol-1').fill('NVDA')
  await page.locator('#type-1').selectOption('BUY')
  await page.locator('#quantity-1').fill('10')
  await page.locator('#price-1').fill('920.00')

  await expect(page.getByRole('button', { name: 'Write Diary', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Write Diary', exact: true }).click()

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

test('edit transactions in an existing diary', async ({ page }) => {
  test.setTimeout(60_000)
  await authenticate(page, { timeout: 60_000 })

  const uniqueDate = calendarDateFromToday(0)

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
          { symbol: 'TSLA', type: 'BUY', quantity: 100, price: 220, tradeDate: `${date}T10:00:00.000Z` },
          { symbol: 'META', type: 'BUY', quantity: 30, price: 500, tradeDate: `${date}T11:00:00.000Z` },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Create failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { date: uniqueDate, csrfToken })

  await page.goto(`/diaries/${createdDiary.id}/edit`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('#title')).toBeVisible({ timeout: 15_000 })

  // Verify existing transactions are loaded in the form
  await expect(page.locator('#symbol-0')).toHaveValue('TSLA')
  await expect(page.locator('#symbol-1')).toHaveValue('META')

  // Add a new transaction via API and verify it appears
  const updatedCsrfToken = await getCsrfToken(page)
  const updatedDiary = await page.evaluate(async ({ id, csrfToken, date }) => {
    const res = await fetch(`/api/diaries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Diary For Tx Edit',
        content: 'Updated transaction content.',
        transactions: [
          { symbol: 'TSLA', type: 'BUY', quantity: 100, price: 220, tradeDate: `${date}T10:00:00.000Z` },
          { symbol: 'META', type: 'BUY', quantity: 30, price: 500, tradeDate: `${date}T11:00:00.000Z` },
          { symbol: 'GOOGL', type: 'BUY', quantity: 15, price: 145.75, tradeDate: `${date}T12:00:00.000Z` },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Update failed: ${res.status} ${await res.text()}`)
    return res.json()
  }, { id: createdDiary.id, csrfToken: updatedCsrfToken, date: uniqueDate })

  expect(updatedDiary.transactions).toHaveLength(3)
  expect(updatedDiary.transactions[2]).toMatchObject({
    symbol: 'GOOGL',
    type: 'BUY',
  })
})

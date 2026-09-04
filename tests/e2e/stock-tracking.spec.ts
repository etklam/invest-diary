import { expect, test } from '@playwright/test'
import { authenticate } from './helpers/auth'

test.describe.configure({ mode: 'serial' })

test('watchlist page displays tracked stocks with record count', async ({ page }) => {
  const mockWatchlistItems = [
    {
      id: '1',
      status: 'WATCHING',
      sortOrder: 0,
      updatedAt: '2026-05-01T00:00:00.000Z',
      stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      recordCount: 5,
      latestRecord: {
        id: '10',
        summary: 'Earnings beat expectations.',
        occurredAt: '2026-04-30T12:00:00.000Z',
        sourceType: 'ARTICLE',
        sourceTitle: 'Q2 Report',
        confidence: 85,
      },
    },
    {
      id: '2',
      status: 'WATCHING',
      sortOrder: 1,
      updatedAt: '2026-04-28T00:00:00.000Z',
      stock: { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      recordCount: 12,
      latestRecord: {
        id: '20',
        summary: 'AI chip demand surging.',
        occurredAt: '2026-04-28T12:00:00.000Z',
        sourceType: 'ARTICLE',
        sourceTitle: 'AI Market',
        confidence: 90,
      },
    },
  ]

  await page.route('**/api/stocks/watchlist**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: mockWatchlistItems }),
    })
  })

  await authenticate(page)

  // Navigate to the watchlist page
  await page.goto('/stocks/watchlist', { waitUntil: 'domcontentloaded' })

  // Verify symbols displayed
  await expect(page.getByText('AAPL')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('NVDA')).toBeVisible()

  // Verify record counts (use exact cell match to avoid date "05/01" false positive)
  await expect(page.getByRole('cell', { name: '5', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '12', exact: true })).toBeVisible()
})

test('add stock to watchlist and verify POST body', async ({ page }) => {
  let createRequestBody: any = null

  // Mock watchlist GET to return empty initially (so we can add)
  await page.route('**/api/stocks/watchlist**', async (route) => {
    if (route.request().method() === 'POST') {
      createRequestBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '99',
          symbol: createRequestBody.symbol,
          sortOrder: 0,
          status: 'WATCHING',
        }),
      })
    } else {
      // GET
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      })
    }
  })

  await authenticate(page)
  await page.goto('/stocks/watchlist', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle')

  // Fill the add stock form — use type() to ensure v-model picks up the value
  const addInput = page.getByPlaceholder(/NVDA|TSLA/i)
  await expect(addInput).toBeVisible({ timeout: 10_000 })
  await addInput.fill('MSFT')

  // Verify the input value was set
  await expect(addInput).toHaveValue('MSFT')

  // Submit through the supported button contract so Vue's submit handler and
  // the real POST request are exercised together.
  await addInput.press('Enter')

  // Verify POST body contains the symbol
  await expect.poll(() => createRequestBody, { timeout: 10_000 }).not.toBeNull()
  expect(createRequestBody.symbol).toBe('MSFT')
})

test('watchlist empty state is shown', async ({ page }) => {
  await page.route('**/api/stocks/watchlist', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })

  await authenticate(page)
  await page.goto('/stocks/watchlist', { waitUntil: 'domcontentloaded' })

  // Empty state should show some indicator
  await expect(page.getByText(/no.*record|無.*資料|empty|沒有任何|no.*timeline/i)).toBeVisible({ timeout: 10_000 })
})

test('single stock Company Hub shows symbol, evidence, and source badge', async ({ page }) => {
  const mockHub = {
    company: { id: '1', symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD', watchStatus: 'WATCHING' },
    position: {
      state: 'research_only',
      quantity: 0,
      averageCost: null,
      totalCost: 0,
      price: null,
      marketValue: null,
      concentrationPct: null,
      concentrationBasis: 'unavailable',
      quoteStatus: 'missing',
    },
    thesis: null,
    latestReview: null,
    reviews: [],
    notes: [],
    relatedDiaries: [],
    evidence: [
      {
        id: '10',
        summary: 'Earnings beat expectations.',
        sourceType: 'DIARY',
        sourceTitle: 'Q2 Review',
        sourceUrl: null,
        occurredAt: '2026-04-30T12:00:00.000Z',
        createdByLabel: null,
      },
      {
        id: '11',
        summary: 'New product launch announced.',
        sourceType: 'ARTICLE',
        sourceTitle: 'Tech News',
        sourceUrl: 'https://example.com/aapl-launch',
        occurredAt: '2026-04-29T00:00:00.000Z',
        createdByLabel: 'Ana',
      },
    ],
  }

  await page.route('**/api/stocks/AAPL/hub', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockHub),
    })
  })

  await authenticate(page)

  await page.goto('/stocks/AAPL', { waitUntil: 'domcontentloaded' })

  // Verify symbol is displayed
  await expect(page.getByText('AAPL')).toBeVisible({ timeout: 10_000 })

  // Evidence is an intentionally collapsed disclosure on the Company Hub.
  await page.locator('details summary').click()

  // Verify summary content
  await expect(page.getByText('Earnings beat expectations.')).toBeVisible()

  // Verify source badge/type is shown (the current Company Hub contract keeps
  // source type/title in the evidence details section).
  await expect(page.getByText('Q2 Review', { exact: true })).toBeVisible()

  // Verify second record
  await expect(page.getByText('New product launch announced.')).toBeVisible()
})

test('Company Hub shows an explicit empty evidence state', async ({ page }) => {
  await page.route('**/api/stocks/EMPTY/hub', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        company: { id: null, symbol: 'EMPTY', name: null, currency: null, watchStatus: null },
        position: {
          state: 'untracked',
          quantity: 0,
          averageCost: null,
          totalCost: 0,
          price: null,
          marketValue: null,
          concentrationPct: null,
          concentrationBasis: 'unavailable',
          quoteStatus: 'missing',
        },
        thesis: null,
        latestReview: null,
        reviews: [],
        notes: [],
        relatedDiaries: [],
        evidence: [],
      }),
    })
  })

  await authenticate(page)
  await page.goto('/stocks/EMPTY', { waitUntil: 'domcontentloaded' })

  await page.locator('details summary').click()
  await expect(page.getByText('No source evidence yet.')).toBeVisible({ timeout: 10_000 })
})

test('archive stock via DELETE request', async ({ page }) => {
  let deleteCalled = false

  await page.route('**/api/stocks/watchlist', async (route) => {
    if (route.request().method() === 'DELETE') {
      deleteCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: '1',
              status: 'WATCHING',
              sortOrder: 0,
              updatedAt: '2026-05-01T00:00:00.000Z',
              stock: { symbol: 'AAPL', name: 'Apple Inc.' },
              recordCount: 1,
              latestRecord: null,
            },
          ],
        }),
      })
    }
  })

  // The current table contract archives a specific watchlist item.
  await page.route('**/api/stocks/watchlist/1', async (route) => {
    if (route.request().method() === 'DELETE') {
      deleteCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    }
  })

  await authenticate(page)
  await page.goto('/stocks/watchlist', { waitUntil: 'domcontentloaded' })

  const archiveButton = page.getByRole('button', { name: /archive/i })
  await expect(archiveButton).toBeVisible({ timeout: 10_000 })
  await archiveButton.click()
  await expect.poll(() => deleteCalled).toBe(true)
})

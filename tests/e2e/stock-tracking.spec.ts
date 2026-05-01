import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function login(page: Parameters<typeof test>[0]['page']) {
  // Mock the login API
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          id: 'stock-e2e-user',
          email: 'test@example.com',
          name: 'Test User',
          role: 'USER',
        },
      }),
    })
  })

  // Mock /api/diaries for the redirect landing page
  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('button.login-submit')).toBeEnabled({ timeout: 15_000 })
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('password123')
  await Promise.all([
    page.waitForURL('**/diaries', { timeout: 45_000 }),
    page.locator('button.login-submit').click(),
  ])
}

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

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'stock-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  await page.route('**/api/stocks/watchlist', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: mockWatchlistItems }),
    })
  })

  await login(page)

  // Navigate to the watchlist/stocks page
  await page.goto('/stocks', { waitUntil: 'domcontentloaded' })

  // Verify symbols displayed
  await expect(page.getByText('AAPL')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('NVDA')).toBeVisible()

  // Verify record counts
  await expect(page.getByText('5')).toBeVisible()
  await expect(page.getByText('12')).toBeVisible()
})

test('add stock to watchlist and verify POST body', async ({ page }) => {
  let createRequestBody: any = null

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'stock-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  // Mock watchlist GET to return empty initially (so we can add)
  await page.route('**/api/stocks/watchlist', async (route) => {
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

  await login(page)
  await page.goto('/stocks', { waitUntil: 'domcontentloaded' })

  // Fill the add stock form
  const addInput = page.getByPlaceholder(/symbol/i).or(page.getByLabel(/symbol/i))
  await addInput.fill('MSFT')

  // Submit
  const addButton = page.locator('button').filter({ hasText: /新增|追加|add/i })
  await addButton.click()

  // Verify POST body contains the symbol
  await expect.poll(() => createRequestBody).not.toBeNull()
  expect(createRequestBody.symbol).toBe('MSFT')
})

test('watchlist empty state is shown', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'stock-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  await page.route('**/api/stocks/watchlist', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [] }),
    })
  })

  await login(page)
  await page.goto('/stocks', { waitUntil: 'domcontentloaded' })

  // Empty state should show some indicator
  await expect(page.getByText(/no.*data|無.*資料|empty|沒有任何|empty|no.*stock/i)).toBeVisible({ timeout: 10_000 })
})

test('single stock timeline page shows symbol, summary, and source badge', async ({ page }) => {
  const mockTimeline = {
    stock: { symbol: 'AAPL', name: 'Apple Inc.' },
    records: [
      {
        id: '10',
        symbol: 'AAPL',
        summary: 'Earnings beat expectations.',
        sourceType: 'DIARY',
        sourceTitle: 'Q2 Review',
        sourceUrl: null,
        sourceDiaryId: '5',
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: 85,
        idempotencyKey: 'abc-123',
        occurredAt: '2026-04-30T12:00:00.000Z',
        createdVia: 'WEB',
        createdByLabel: null,
        metadataJson: null,
        createdAt: '2026-04-30T12:00:00.000Z',
        updatedAt: '2026-04-30T12:00:00.000Z',
      },
      {
        id: '11',
        symbol: 'AAPL',
        summary: 'New product launch announced.',
        sourceType: 'ARTICLE',
        sourceTitle: 'Tech News',
        sourceUrl: 'https://example.com/aapl-launch',
        sourceDiaryId: null,
        sourceExternalId: null,
        sourceExcerpt: 'Apple announced...',
        confidence: 75,
        idempotencyKey: 'article-aapl-1',
        occurredAt: '2026-04-29T00:00:00.000Z',
        createdVia: 'API_KEY',
        createdByLabel: 'Ana',
        metadataJson: null,
        createdAt: '2026-04-29T00:00:00.000Z',
        updatedAt: '2026-04-29T00:00:00.000Z',
      },
    ],
  }

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'stock-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  await page.route('**/api/stocks/AAPL/timeline', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockTimeline),
    })
  })

  await login(page)

  // Navigate to single stock timeline page
  await page.goto('/stocks/AAPL/timeline', { waitUntil: 'domcontentloaded' })

  // Verify symbol is displayed
  await expect(page.getByText('AAPL')).toBeVisible({ timeout: 10_000 })

  // Verify summary content
  await expect(page.getByText('Earnings beat expectations.')).toBeVisible()

  // Verify source badge/type is shown (DIARY, ARTICLE)
  await expect(page.getByText('DIARY').or(page.getByText('ARTICLE'))).toBeVisible()

  // Verify second record
  await expect(page.getByText('New product launch announced.')).toBeVisible()
})

test('timeline page shows empty state when no records', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'stock-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

  await page.route('**/api/stocks/EMPTY/timeline', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        stock: { symbol: 'EMPTY', name: null },
        records: [],
      }),
    })
  })

  await login(page)
  await page.goto('/stocks/EMPTY/timeline', { waitUntil: 'domcontentloaded' })

  // Should show empty data indicator
  await expect(page.getByText(/no.*data|無.*資料|empty|no.*record/i)).toBeVisible({ timeout: 10_000 })
})

test('archive stock via DELETE request', async ({ page }) => {
  let deleteCalled = false

  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { id: 'stock-e2e-user', email: 'test@example.com', name: 'Test User', role: 'USER' },
      }),
    })
  })

  await page.route('**/api/diaries', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })

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

  // Also mock the DELETE for the specific watchlist item
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

  await login(page)
  await page.goto('/stocks', { waitUntil: 'domcontentloaded' })

  // Look for a delete/archive button and click it
  const deleteButton = page.locator('button').filter({ hasText: /delete|刪除|删除/i }).first()
  const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)

  if (hasDeleteButton) {
    page.once('dialog', async (dialog) => {
      await dialog.accept()
    })
    await deleteButton.click()
  }

  // If we have a delete flow, verify the DELETE was triggered
  // Otherwise this is a soft-skip (the page might not have in-page archive)
  expect(hasDeleteButton).toBe(true)
  expect(deleteCalled).toBe(true)
})

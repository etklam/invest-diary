import { expect, test } from '@playwright/test'

const mockedQuotePrices: Record<string, number> = {
  '^GSPC': 5100,
  SPY: 510,
  SPLG: 51,
  QQQ: 470,
  QQQM: 235,
  GLD: 220,
  GLDM: 44,
}

function presetButtonName(primary: string, relative: string): RegExp {
  return new RegExp(`^${escapeForRegex(primary)} / ${escapeForRegex(relative)}\\b`)
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('/tools/relative-value loads and supports manual/auto target price modes on mobile', async ({ page }) => {
  await page.goto('/tools/relative-value', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('#amber-symbol')).toBeVisible()
  await expect(page.locator('#violet-symbol')).toBeVisible()

  const targetPrices = page.locator('#target-prices')
  await expect(targetPrices).toBeHidden()

  await page.getByRole('button', { name: /manual/i }).click()
  await expect(targetPrices).toBeVisible()

  await page.getByRole('button', { name: /auto/i }).click()
  await expect(targetPrices).toBeHidden()
})

test('/tools/relative-value encodes caret-prefixed symbols when loading a preset', async ({ page }) => {
  await page.route('**/api/market/historical**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { timestamp: 1704067200, close: 100 },
        { timestamp: 1706745600, close: 101 },
      ]),
    })
  })

  const quoteUrls: string[] = []

  await page.route('**/api/market/quote/**', async route => {
    quoteUrls.push(route.request().url())
    const encodedSymbol = route.request().url().split('/').pop() ?? ''
    const symbol = decodeURIComponent(encodedSymbol)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        symbol,
        regularMarketPrice: mockedQuotePrices[symbol] ?? 100,
        previousClose: (mockedQuotePrices[symbol] ?? 100) - 1,
        change: 1,
        changePercent: 1.01,
        currency: 'USD',
        marketState: 'REGULAR',
        lastUpdateTime: '2026-04-02T00:00:00.000Z',
      }),
    })
  })

  await page.goto('/tools/relative-value', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.getByRole('button', { name: presetButtonName('^GSPC', 'SPY') }).click()

  await expect.poll(() => quoteUrls.length).toBe(2)
  await expect(page.locator('#amber-price')).toHaveValue(String(mockedQuotePrices['^GSPC']))
  await expect(page.locator('#violet-price')).toHaveValue(String(mockedQuotePrices.SPY))
  expect(quoteUrls.some(url => url.includes('/api/market/quote/%5EGSPC'))).toBeTruthy()
})

test('/tools/relative-value preset cards populate all symbol pairs and quotes', async ({ page }) => {
  const historicalRequests: string[] = []
  const quoteRequests: string[] = []

  await page.route('**/api/market/historical**', async route => {
    historicalRequests.push(route.request().url())
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { timestamp: 1704067200, close: 100 },
        { timestamp: 1706745600, close: 101 },
      ]),
    })
  })

  await page.route('**/api/market/quote/**', async route => {
    quoteRequests.push(route.request().url())
    const encodedSymbol = route.request().url().split('/').pop() ?? ''
    const symbol = decodeURIComponent(encodedSymbol)
    const regularMarketPrice = mockedQuotePrices[symbol] ?? 100

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        symbol,
        regularMarketPrice,
        previousClose: regularMarketPrice - 1,
        change: 1,
        changePercent: 1,
        currency: 'USD',
        marketState: 'REGULAR',
        lastUpdateTime: '2026-04-02T00:00:00.000Z',
      }),
    })
  })

  await page.goto('/tools/relative-value', { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})

  const presets = [
    { primary: '^GSPC', relative: 'SPY' },
    { primary: 'SPY', relative: 'SPLG' },
    { primary: 'QQQ', relative: 'QQQM' },
    { primary: 'GLD', relative: 'GLDM' },
  ]

  for (const preset of presets) {
    await page.getByRole('button', { name: presetButtonName(preset.primary, preset.relative) }).click()

    await expect(page.locator('#amber-symbol')).toHaveValue(preset.primary)
    await expect(page.locator('#violet-symbol')).toHaveValue(preset.relative)
    await expect(page.locator('#amber-price')).toHaveValue(String(mockedQuotePrices[preset.primary]))
    await expect(page.locator('#violet-price')).toHaveValue(String(mockedQuotePrices[preset.relative]))
    await expect(page.getByText('Quote unavailable. Please try again later.')).toHaveCount(0)
  }

  expect(quoteRequests.length).toBe(8)
  expect(historicalRequests.length).toBeGreaterThanOrEqual(8)
})

import { expect, test, type Page } from '@playwright/test'
import { authenticate } from './helpers/auth'

test.setTimeout(90_000)

const authenticatedUser = {
  id: 'e2e-mobile-navigation',
  email: 'test@example.com',
  role: 'USER',
  name: 'Test User',
  timezone: 'Asia/Taipei',
}

const emptyPortfolioValuation = {
  totalHoldings: 0,
  totalCost: 0,
  currentMarketValue: null,
  unrealizedAmount: null,
  unrealizedPct: null,
  totalDayChange: null,
  totalDayChangePercent: null,
  largestPositionPct: null,
  top3ConcentrationPct: null,
  activePositionCount: 0,
  concentrationWarning: false,
  largestPositionSymbol: null,
  pricedPositionCount: 0,
  unpricedPositionCount: 0,
  pricedCostBasis: 0,
  unpricedCostBasis: 0,
  quoteCoveragePct: 0,
  valuationAsOf: null,
  staleQuoteCount: 0,
  valuationStatus: 'empty',
  unsupportedMetrics: ['ytdReturn', 'realCashPercentage', 'sectorConcentration'],
}

async function mockJson(page: Page, url: string, payload: unknown) {
  await page.route(url, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    })
  })
}

async function setupAuthenticatedApiMocks(page: Page) {
  await mockJson(page, '**/api/auth/login', { ok: true, data: authenticatedUser })
  await mockJson(page, '**/api/auth/me', { ok: true, data: authenticatedUser })
  await mockJson(page, '**/api/diaries**', { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } })
  await mockJson(page, '**/api/stocks/portfolio', { holdings: [], valuation: emptyPortfolioValuation, quoteErrors: [], marketState: null })
  await mockJson(page, '**/api/portfolio/attention', { items: [], asOf: new Date().toISOString(), coverage: { valuationStatus: 'empty', complete: true, priced: 0, total: 0 } })
  await mockJson(page, '**/api/investment-activity', { items: [], nextCursor: null, asOf: new Date().toISOString() })
  await mockJson(page, '**/api/reviews', { unscheduled: [], overdue: [], today: [], upcoming: [], completed: [] })
  await mockJson(page, '**/api/alerts', [])
  await mockJson(page, '**/api/stocks/holdings', [])
  await mockJson(page, '**/api/stocks/exposure', null)
  await mockJson(page, '**/api/stats/performance**', null)
}

test('mobile BottomNavigation portfolio link opens the portfolio page at common phone widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setupAuthenticatedApiMocks(page)

  await authenticate(page)
  await expect(page.locator('main h1:visible').first()).toBeVisible({ timeout: 15_000 })

  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 })

    const portfolioLink = page.locator('nav.fixed.bottom-0 a[href="/stocks"]')
    await expect(portfolioLink).toBeVisible()
    await expect(portfolioLink).toContainText(/portfolio|投資組合/i)

    // Nuxt DevTools' dev-only frame can intercept pointer coordinates at 320px.
    if (width === 320) {
      await portfolioLink.evaluate((link) => (link as HTMLAnchorElement).click())
    } else {
      await portfolioLink.click()
    }

    await expect(page).toHaveURL(/\/stocks$/)
    await expect(page.locator('main h1:visible').first()).toBeVisible({ timeout: 15_000 })

    if (width !== 390) {
      const timelineLink = page.locator('nav.fixed.bottom-0 a[href="/timeline"]')
      if (width === 320) {
        await timelineLink.evaluate((link) => (link as HTMLAnchorElement).click())
      } else {
        await timelineLink.click()
      }
      await expect(page).toHaveURL(/\/timeline$/)
      await expect(page.locator('main h1:visible').first()).toBeVisible({ timeout: 15_000 })
    }
  }
})

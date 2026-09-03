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

async function setupAuthenticatedApiMocks(page: Page, options: { longTimeline?: boolean } = {}) {
  const longSymbol = 'UNBREAKABLESYMBOL1234567890'
  const longTag = 'UNBREAKABLETAG1234567890'
  const longDiary = {
    id: 'e2e-long-diary',
    userId: authenticatedUser.id,
    title: 'A title with an intentionally long unbroken investment thesis symbol AAAAAAAAAAAAAAAAAAAA',
    content: 'A long piece of user content that should remain inside the timeline card even when the viewport is only 320 pixels wide. '.repeat(4),
    tags: [longTag, 'anotherlongtagabcdefghij'],
    tagsString: `${longTag},anotherlongtagabcdefghij`,
    createdVia: 'WEB',
    createdByLabel: null,
    date: '2026-09-03',
    createdAt: '2026-09-03T08:00:00.000Z',
    updatedAt: '2026-09-03T08:00:00.000Z',
    transactions: [],
    alerts: [],
    tradePlans: [],
    stockSymbols: [longSymbol],
  }
  const timelinePayload = options.longTimeline
    ? { data: [longDiary], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }
    : { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  const portfolioPayload = options.longTimeline
    ? {
        holdings: [{ symbol: longSymbol, quantity: 123, avgCost: 99999999, totalCost: 12299999877, price: 100000000 }],
        valuation: { ...emptyPortfolioValuation, totalHoldings: 1, totalCost: 12299999877, currentMarketValue: 12300000000, pricedPositionCount: 1, unpricedPositionCount: 0, pricedCostBasis: 12299999877, unpricedCostBasis: 0, quoteCoveragePct: 100, valuationStatus: 'complete' },
        quoteErrors: [],
        marketState: null,
      }
    : { holdings: [], valuation: emptyPortfolioValuation, quoteErrors: [], marketState: null }
  const attentionPayload = options.longTimeline
    ? {
        items: [{ id: 'attention-1', reason: 'position_concentration', targetKind: 'stock', targetId: longSymbol, symbol: longSymbol, priority: 1, action: `/stocks/${longSymbol}`, evidence: { title: 'A very long evidence title that must wrap instead of widening the attention row' }, asOf: '2026-09-03T08:00:00.000Z' }],
        asOf: '2026-09-03T08:00:00.000Z',
        coverage: { valuationStatus: 'complete', complete: true, priced: 1, total: 1 },
      }
    : { items: [], asOf: new Date().toISOString(), coverage: { valuationStatus: 'empty', complete: true, priced: 0, total: 0 } }
  const activityPayload = options.longTimeline
    ? {
        data: [{ id: 'diary:e2e-long-diary', kind: 'diary', symbol: longSymbol, title: 'Long activity title that must shrink', summary: 'Long activity summary', source: { kind: 'user', label: null }, diaryId: 'e2e-long-diary', destination: '/diaries/e2e-long-diary', occurredAt: '2026-09-03', metadata: { symbols: [longSymbol], transactionContext: [], reviewOutcome: null, reviewStatus: null, alertCount: 0, tradePlanSummary: null } }],
        pagination: { nextCursor: null, hasMore: false, asOf: '2026-09-03T08:00:00.000Z' },
      }
    : { data: [], pagination: { nextCursor: null, hasMore: false, asOf: new Date().toISOString() } }
  const reviewPayload = options.longTimeline
    ? { unscheduled: [], overdue: [], today: [], upcoming: [{ id: 'review-1', title: 'A very long upcoming review title that must not widen the card', targetType: 'diary', symbol: null, reviewDueAt: '2026-09-04T08:00:00.000Z' }], completed: [] }
    : { unscheduled: [], overdue: [], today: [], upcoming: [], completed: [] }

  await mockJson(page, '**/api/auth/login', { ok: true, data: authenticatedUser })
  await mockJson(page, '**/api/auth/me', { ok: true, data: authenticatedUser })
  await mockJson(page, '**/api/diaries**', timelinePayload)
  await mockJson(page, '**/api/stocks/portfolio', portfolioPayload)
  await mockJson(page, '**/api/portfolio/attention', attentionPayload)
  await mockJson(page, '**/api/investment-activity', activityPayload)
  await mockJson(page, '**/api/reviews', reviewPayload)
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

test('authenticated Timeline shell has no document overflow with long content at supported widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await setupAuthenticatedApiMocks(page, { longTimeline: true })

  await authenticate(page)
  await expect(page.locator('main h1:visible').first()).toBeVisible({ timeout: 15_000 })
  await page.locator('details.timeline-overview > summary').click()
  await expect(page.locator('#overview-portfolio-title')).toBeVisible()

  for (const width of [320, 375, 390, 393, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 })

    const metrics = await page.evaluate(() => {
      const root = document.documentElement
      const shell = document.querySelector<HTMLElement>('.default-shell')
      const main = document.querySelector<HTMLElement>('#main-content')
      return {
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        clientWidth: root.clientWidth,
        shellWidth: shell?.getBoundingClientRect().width ?? null,
        mainWidth: main?.getBoundingClientRect().width ?? null,
      }
    })

    expect(metrics.rootScrollWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(metrics.clientWidth)
    expect(metrics.bodyScrollWidth, `body overflow at ${width}px`).toBeLessThanOrEqual(metrics.clientWidth)
    expect(metrics.shellWidth, `authenticated shell overflow at ${width}px`).toBeLessThanOrEqual(metrics.clientWidth)
    expect(metrics.mainWidth, `main overflow at ${width}px`).toBeLessThanOrEqual(metrics.clientWidth)
  }
})

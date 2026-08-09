import { expect, test } from '@playwright/test'

const diaryListItem = {
  id: '42',
  userId: '7',
  title: 'Decision Record Visual QA',
  content: 'Original note',
  tags: ['learning', 'swing'],
  tagsString: 'learning,swing',
  createdVia: 'WEB',
  createdByLabel: null,
  date: '2026-08-01T12:00:00.000Z',
  createdAt: '2026-08-01T12:00:00.000Z',
  updatedAt: '2026-08-02T12:00:00.000Z',
  thesis: 'Demand should remain durable.',
  risk: 'Margins could compress.',
  execution: 'Wait for confirmation before entering.',
  reviewDueAt: null,
  reviewStatus: 'reviewed',
  reviewedAt: '2026-08-08T12:00:00.000Z',
  reviewOutcome: 'PARTIAL',
  transactions: [{
    id: '90',
    symbol: 'AAPL',
    type: 'BUY',
    quantity: '2',
    price: '200',
    tradeDate: '2026-08-02T14:30:00.000Z',
  }],
  alerts: [],
  tradePlanSummary: {
    total: 1,
    statuses: [{ status: 'active', count: 1 }],
  },
}

const diaryDetail = {
  ...diaryListItem,
  content: '## Original note\nPreserve the evidence that existed at decision time.',
  reviewSummary: 'The thesis held, but timing was early.',
  reviewLearning: 'Wait for confirmation from the recorded signal.',
  reviewAdjustment: 'Reduce initial size before confirmation.',
  transactions: [{
    ...diaryListItem.transactions[0],
    notes: 'Started small after confirmation.',
    strategy: 'Breakout',
    emotion: 'calm',
  }],
  alerts: [{
    id: '8',
    message: 'Check the next earnings release',
    triggerAt: '2026-08-20T12:00:00.000Z',
    isDismissed: false,
  }],
  tradePlans: [{
    id: '12',
    userId: '7',
    diaryId: '42',
    symbol: 'AAPL',
    setupType: 'Breakout',
    entryPrice: '200',
    entryZoneLow: '198',
    entryZoneHigh: '202',
    stopLoss: '190',
    targetPrice: '230',
    maxPositionSize: '4000',
    invalidationCondition: 'Close below support',
    notes: 'Require volume confirmation',
    status: 'active',
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  }],
}

test('Decision Record keeps its hierarchy and width across supported breakpoints', async ({ page }) => {
  test.setTimeout(60_000)

  await page.context().addCookies([{
    name: 'i18n_locale',
    value: 'en',
    domain: '127.0.0.1',
    path: '/',
  }])

  await page.route('**/api/diaries**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    const body = pathname === '/api/diaries/42'
      ? diaryDetail
      : {
          data: [diaryListItem],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  await page.goto('/auth/login', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean((document.querySelector('#__nuxt') as any)?.__vue_app__))
  await page.evaluate(async () => {
    const nuxt = (document.querySelector('#__nuxt') as any).__vue_app__.config.globalProperties.$nuxt
    nuxt.payload.state['$sauth:user'] = {
      id: '7',
      email: 'decision@example.com',
      name: 'Decision Tester',
      role: 'USER',
      timezone: 'UTC',
    }
    nuxt.payload.state['$sauth:initialized'] = true
    await nuxt.$router.push('/diaries/42')
  })
  await expect(page).toHaveURL(/\/diaries\/42$/)

  const headings = ['Original Decision', 'Trade Plan', 'Actual Execution', 'Review']
  for (const heading of headings) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }

  const yPositions = await Promise.all(headings.map(async heading => (
    await page.getByRole('heading', { name: heading, exact: true }).boundingBox()
  )?.y ?? 0))
  expect(yPositions).toEqual([...yPositions].sort((a, b) => a - b))
  await expect(page.getByRole('link', { name: 'Create Trade Plan' })).toHaveAttribute('href', /diaryId=42/)
  await expect(page.getByRole('link', { name: 'AAPL' })).toHaveAttribute('href', '/trade-plans/12')
  await expect(page.getByText('Started small after confirmation.', { exact: true })).toBeVisible()

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('heading', { name: 'Original Decision', exact: true })).toBeVisible()
  }

  await page.getByText('Holdings context', { exact: true }).click()
  await expect(page.getByText('Average cost', { exact: true }).first()).toBeVisible()
})

import { type Page, expect, test } from '@playwright/test'
import { authenticate, setLocale } from './helpers/auth'

function calendarDateFromToday(offsetDays: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return date.toISOString().slice(0, 10)
}

async function getCsrfToken(page: Page): Promise<string> {
  await page.evaluate(async () => {
    await fetch('/api/diaries', { method: 'GET' })
  })
  const token = (await page.context().cookies()).find(cookie => cookie.name === 'csrf-token')?.value ?? ''
  if (!token) throw new Error('CSRF token not found for Decision Record fixture')
  return token
}

test('Decision Record keeps its hierarchy and width across supported breakpoints', async ({ page }) => {
  test.setTimeout(60_000)

  await setLocale(page, 'en')

  await authenticate(page)
  const date = calendarDateFromToday(0)
  const csrfToken = await getCsrfToken(page)
  const createdDiary = await page.evaluate(async ({ date, csrfToken }) => {
    const response = await fetch('/api/diaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        title: 'Decision Record Visual QA',
        content: '## Original note\nPreserve the evidence that existed at decision time.',
        date,
        thesis: 'Demand should remain durable.',
        risk: 'Margins could compress.',
        execution: 'Wait for confirmation before entering.',
        transactions: [{
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 2,
          price: 200,
          tradeDate: `${date}T14:30:00.000Z`,
          notes: 'Started small after confirmation.',
          strategy: 'Breakout',
          emotion: 'calm',
        }],
      }),
    })
    if (!response.ok) throw new Error(`Decision diary fixture failed: ${response.status} ${await response.text()}`)
    return await response.json() as { id: string }
  }, { date, csrfToken })

  const planResponse = await page.evaluate(async ({ diaryId, csrfToken }) => {
    const response = await fetch('/api/trade-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
      body: JSON.stringify({
        diaryId,
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
      }),
    })
    if (!response.ok) throw new Error(`Trade plan fixture failed: ${response.status} ${await response.text()}`)
    return await response.json() as { id: string }
  }, { diaryId: createdDiary.id, csrfToken })

  await page.goto(`/diaries/${createdDiary.id}`, { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveURL(new RegExp(`/diaries/${createdDiary.id}$`))

  const headings = ['Original Decision', 'Trade Plan', 'Actual Execution', 'Review']
  for (const heading of headings) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  }

  const yPositions = await Promise.all(headings.map(async heading => (
    await page.getByRole('heading', { name: heading, exact: true }).boundingBox()
  )?.y ?? 0))
  expect(yPositions).toEqual([...yPositions].sort((a, b) => a - b))
  await expect(page.getByRole('link', { name: 'Create Trade Plan' })).toHaveAttribute('href', new RegExp(`diaryId=${createdDiary.id}`))
  await expect(page.getByRole('link', { name: 'AAPL' })).toHaveAttribute('href', `/trade-plans/${planResponse.id}`)
  await expect(page.getByText('Started small after confirmation.', { exact: true })).toBeVisible()

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await expect(page.getByRole('heading', { name: 'Original Decision', exact: true })).toBeVisible()
  }

  await page.getByText('Holdings context', { exact: true }).click()
  await expect(page.getByText('Average cost', { exact: true }).first()).toBeVisible()
})

import { expect, test } from '@playwright/test'

const company = { cik: '0000320193', name: 'Apple Inc.', tickers: ['AAPL'], exchanges: ['Nasdaq'], matchedBy: 'ticker' }
const filing = { cik: company.cik, accession: '0000320193-24-000123', filingDate: '2024-11-01', reportDate: '2024-09-28', acceptanceDateTime: '2024-11-01T12:00:00.000Z', form: '10-K', isAmendment: false, primaryDocument: 'a10-k.htm', primaryDocumentDescription: 'FORM 10-K', fileNumber: '001', filmNumber: '123', items: null, size: 1000 }
const meta = { stale: false, cacheStatus: 'miss', fetchedAt: '2026-01-01T00:00:00.000Z' }

test('searches a company, lists filings, and exposes batch download on desktop', async ({ page }) => {
  test.setTimeout(60_000)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.route(/\/api\/tools\/sec-filings\/companies(?:\?.*)?$/, route => route.fulfill({ json: { data: [company], meta } }))
  await page.route(new RegExp(`/api/tools/sec-filings/companies/${company.cik}/filings(?:\\?.*)?$`), route => route.fulfill({ json: { data: { company, filings: [filing], nextCursor: null }, meta } }))
  await page.goto('/tools/sec-filings', { waitUntil: 'load' })
  await expect(page.getByLabel('Company search')).toHaveAttribute('data-hydrated', 'true')
  await page.getByLabel('Company search').fill('AAPL')
  await page.getByRole('button', { name: /Apple Inc/ }).click()
  await expect(page.locator('td', { hasText: '0000320193-24-000123' })).toBeVisible()
  await page.locator('input[type="checkbox"]').first().check()
  await expect(page.getByRole('link', { name: 'Download batch ZIP' })).toHaveAttribute('href', /accessions=0000320193-24-000123/)
})

test('shows original documents and the no-PDF state on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const documents = [{ basename: 'a10-k.htm', description: 'FORM 10-K', type: '10-K', sequence: 1, size: 1000, classification: 'primary', isPrimary: true, isPdf: false, isXbrl: false, isExhibit: false }]
  await page.route(`**/api/tools/sec-filings/companies/${company.cik}/filings/${filing.accession}`, route => route.fulfill({ json: { data: { company, filing, documents, hasPdf: false }, meta } }))
  await page.goto(`/tools/sec-filings/${company.cik}/${filing.accession}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '10-K' })).toBeVisible()
  await expect(page.getByText(/does not include an original PDF/)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download', exact: true })).toHaveAttribute('href', /a10-k.htm/)
  const width = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(width).toBeLessThanOrEqual(1)
})

test('shows loading, empty, and stale-cache states', async ({ page }) => {
  await page.route(/\/api\/tools\/sec-filings\/companies(?:\?.*)?$/, route => route.fulfill({ json: { data: [company], meta } }))
  await page.route(new RegExp(`/api/tools/sec-filings/companies/${company.cik}/filings(?:\\?.*)?$`), async (route) => {
    await new Promise(resolve => setTimeout(resolve, 750))
    await route.fulfill({ json: { data: { company, filings: [], nextCursor: null }, meta: { ...meta, stale: true, cacheStatus: 'stale' } } })
  })
  await page.goto('/tools/sec-filings', { waitUntil: 'load' })
  const search = page.getByLabel('Company search')
  await expect(search).toHaveAttribute('data-hydrated', 'true')
  await search.fill('AAPL')
  await page.getByRole('button', { name: /Apple Inc/ }).click()
  await expect(page.getByText('Loading SEC filings…')).toBeVisible()
  await expect(page.getByText('No filings match these filters.')).toBeVisible()
  await expect(page.getByText(/Showing the latest cached data/)).toBeVisible()
})

test('shows rate-limited and unavailable provider errors', async ({ page }) => {
  await page.route(/\/api\/tools\/sec-filings\/companies(?:\?.*)?$/, async (route) => {
    const query = new URL(route.request().url()).searchParams.get('q')
    const code = query === 'RATE' ? 'SEC_RATE_LIMITED' : 'SEC_UPSTREAM_UNAVAILABLE'
    await route.fulfill({ status: code === 'SEC_RATE_LIMITED' ? 429 : 503, json: { data: { code } } })
  })
  await page.goto('/tools/sec-filings', { waitUntil: 'load' })
  const search = page.getByLabel('Company search')
  await expect(search).toHaveAttribute('data-hydrated', 'true')
  await search.fill('RATE')
  await expect(page.getByText(/Too many SEC filing requests/)).toBeVisible()
  await search.fill('DOWN')
  await expect(page.getByText(/SEC EDGAR is temporarily unavailable/)).toBeVisible()
})

test('exposes an original PDF when the SEC index includes one', async ({ page }) => {
  const documents = [
    { basename: 'a10-k.htm', description: 'FORM 10-K', type: '10-K', sequence: 1, size: 1000, classification: 'primary', isPrimary: true, isPdf: false, isXbrl: false, isExhibit: false },
    { basename: 'annual-report.pdf', description: 'Annual report PDF', type: 'EX-99', sequence: 2, size: 2000, classification: 'pdf', isPrimary: false, isPdf: true, isXbrl: false, isExhibit: true },
  ]
  await page.route(`**/api/tools/sec-filings/companies/${company.cik}/filings/${filing.accession}`, route => route.fulfill({ json: { data: { company, filing, documents, hasPdf: true }, meta } }))
  await page.goto(`/tools/sec-filings/${company.cik}/${filing.accession}`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Original PDF')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download', exact: true })).toHaveCount(2)
  await expect(page.getByText(/does not include an original PDF/)).toHaveCount(0)
})

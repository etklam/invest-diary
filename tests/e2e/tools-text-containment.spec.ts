import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({
  viewport: { width: 1024, height: 900 },
  isMobile: false,
  hasTouch: false,
})

async function setEnglishLocale(page: Page) {
  await page.context().addCookies([
    {
      name: 'i18n_locale',
      value: 'en',
      domain: '127.0.0.1',
      path: '/',
    },
  ])
}

async function expectNoHorizontalOverflow(locator: Locator, label: string) {
  const offenders = await locator.evaluateAll((elements) => {
    return elements.flatMap((element) => {
      if (!(element instanceof HTMLElement)) {
        return []
      }

      const overflowX = element.scrollWidth - element.clientWidth

      if (overflowX <= 1) {
        return []
      }

      return [{
        text: (element.innerText || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
        overflowX: Math.round(overflowX),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }]
    })
  })

  expect(offenders, `${label} should wrap instead of overflowing`).toEqual([])
}

test('position sizing rounding choices keep long English labels inside their cards', async ({ page }) => {
  await setEnglishLocale(page)
  await page.goto('/tools/position-sizing', { waitUntil: 'domcontentloaded' })

  const roundingChoices = page.locator('button.choice-card').filter({ hasText: /Round/ })

  await expect(roundingChoices).toHaveCount(3)
  await expectNoHorizontalOverflow(roundingChoices, 'position sizing rounding choices')
})

test('financial freedom yearly projection stats keep long English labels inside their cards', async ({ page }) => {
  await setEnglishLocale(page)
  await page.goto('/tools/financial-freedom', { waitUntil: 'domcontentloaded' })

  const numericInputs = page.locator('input[type="number"]')
  await numericInputs.nth(0).fill('600000')
  await numericInputs.nth(1).fill('1000000')
  await numericInputs.nth(2).fill('20000')
  await numericInputs.nth(3).fill('8')

  const firstProjectionRow = page.getByRole('group', { name: /^Year 1(?:\s|$)/ })
  await expect(firstProjectionRow).toBeVisible()

  await expectNoHorizontalOverflow(
    firstProjectionRow.getByRole('group', { name: /^(Contribution|Returns|Ending Assets)$/ }),
    'financial freedom yearly projection stats',
  )
})

test('SEC company search keeps long issuer names inside the results panel', async ({ page }) => {
  await setEnglishLocale(page)
  await page.route(/\/api\/tools\/sec-filings\/companies(?:\?.*)?$/, route => route.fulfill({
    json: {
      data: [{
        cik: '0001234567',
        name: 'International Consolidated Advanced Technologies and Financial Holdings Corporation',
        tickers: ['ICATFH'],
        exchanges: ['Nasdaq'],
        matchedBy: 'name',
      }],
      meta: { stale: false, cacheStatus: 'miss', fetchedAt: '2026-01-01T00:00:00.000Z' },
    },
  }))

  await page.goto('/tools/sec-filings', { waitUntil: 'load' })
  const search = page.getByLabel('Company search')
  await expect(search).toHaveAttribute('data-hydrated', 'true')
  await search.fill('International')

  const result = page.getByRole('button', { name: /International Consolidated/ })
  await expect(result).toBeVisible()
  await expectNoHorizontalOverflow(result, 'SEC company search result')
})

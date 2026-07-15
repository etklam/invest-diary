import { expect, test } from '@playwright/test'

const toolPages = [
  '/tools/position-sizing',
  '/tools/seasonality',
  '/tools/market-rotation',
  '/tools/financial-freedom',
  '/tools/sec-filings',
]

for (const path of toolPages) {
  test(`${path} should not cause page-level horizontal overflow on mobile`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' })

    await expect(page.locator('h1:visible').first()).toBeVisible()

    const metrics = await page.evaluate(() => {
      const viewportWidth = window.innerWidth
      const root = document.documentElement
      const body = document.body

      return {
        viewportWidth,
        rootScrollWidth: root.scrollWidth,
        bodyScrollWidth: body.scrollWidth,
      }
    })

    expect(metrics.rootScrollWidth, `documentElement.scrollWidth exceeded viewport on ${path}`).toBeLessThanOrEqual(metrics.viewportWidth + 1)
    expect(metrics.bodyScrollWidth, `body.scrollWidth exceeded viewport on ${path}`).toBeLessThanOrEqual(metrics.viewportWidth + 1)
  })
}

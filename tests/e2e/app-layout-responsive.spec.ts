import { expect, test } from '@playwright/test'
import { authenticate } from './helpers/auth'

const viewports = [320, 375, 390, 768, 1024, 1279, 1280, 1440]
const routes = [
  { path: '/timeline', width: 'app' },
  { path: '/diaries', width: 'app' },
  { path: '/stocks', width: 'wide' },
  { path: '/calendar', width: 'app' },
  { path: '/tools/market-rotation', width: 'wide' },
  { path: '/stocks/watchlist', width: 'app' },
  { path: '/timeline/compare', width: 'app' },
  { path: '/diaries/quick', width: 'app' },
  { path: '/alerts', width: 'app' },
  { path: '/settings', width: 'app' },
  { path: '/partners', width: 'app' },
  { path: '/trade-plans', width: 'app' },
] as const

test.setTimeout(180_000)

test('authenticated layout stays stable across viewport and route matrix', async ({ page }) => {
  await authenticate(page)

  for (const viewportWidth of viewports) {
    await page.setViewportSize({ width: viewportWidth, height: 900 })

    const desktopNavigation = page.locator('nav ul').first()
    const mobileMenuButton = page.locator('nav button[aria-haspopup="dialog"][aria-label]')
    if (viewportWidth >= 1280) {
      await expect(desktopNavigation).toBeVisible()
      await expect(mobileMenuButton).toBeHidden()
    } else {
      await expect(desktopNavigation).toBeHidden()
      await expect(mobileMenuButton).toBeVisible()
    }

    const measurements: Array<{
      path: string
      width: string
      left: number
      rootScrollWidth: number
      bodyScrollWidth: number
      clientWidth: number
    }> = []

    for (const route of routes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      await expect(page.locator('main h1:visible').first()).toBeVisible({ timeout: 15_000 })

      const metrics = await page.evaluate(() => {
        const container = document.querySelector<HTMLElement>('main [data-page-container]')
        const navigationContainer = document.querySelector<HTMLElement>('nav [data-page-container]')
        const root = document.documentElement

        return {
          containerWidth: container?.dataset.pageContainerWidth ?? null,
          left: container?.getBoundingClientRect().left ?? null,
          navigationLeft: navigationContainer?.getBoundingClientRect().left ?? null,
          rootScrollWidth: root.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          clientWidth: root.clientWidth,
          scrollbarGutter: getComputedStyle(root).scrollbarGutter,
          overflowingElements: Array.from(document.querySelectorAll<HTMLElement>('*'))
            .map(element => {
              const rect = element.getBoundingClientRect()
              return {
                tag: element.tagName.toLowerCase(),
                id: element.id,
                className: element.className,
                left: Math.round(rect.left),
                right: Math.round(rect.right),
              }
            })
            .filter(element => element.left < 0 || element.right > root.clientWidth)
            .slice(0, 10),
        }
      })

      expect(metrics.containerWidth, `missing PageContainer on ${route.path}`).toBe(route.width)
      expect(metrics.left).not.toBeNull()
      if (route.width === 'app') {
        expect(Math.round(metrics.navigationLeft ?? 0), `navigation/page grid misaligned on ${route.path} at ${viewportWidth}px`).toBe(Math.round(metrics.left ?? 0))
      }
      expect(metrics.scrollbarGutter).toBe('stable')
      expect(metrics.rootScrollWidth, `document overflow on ${route.path} at ${viewportWidth}px: ${JSON.stringify(metrics.overflowingElements)}`).toBeLessThanOrEqual(metrics.clientWidth)
      expect(metrics.bodyScrollWidth, `body overflow on ${route.path} at ${viewportWidth}px`).toBeLessThanOrEqual(metrics.clientWidth)

      measurements.push({
        path: route.path,
        width: metrics.containerWidth,
        left: metrics.left ?? 0,
        rootScrollWidth: metrics.rootScrollWidth,
        bodyScrollWidth: metrics.bodyScrollWidth,
        clientWidth: metrics.clientWidth,
      })
    }

    const appLeftEdges = measurements
      .filter(measurement => measurement.width === 'app')
      .map(measurement => Math.round(measurement.left))

    expect([...new Set(appLeftEdges)], `app PageContainer left edge changed at ${viewportWidth}px`).toHaveLength(1)
  }
})

test('client-side route changes keep the app grid aligned', async ({ page }) => {
  await authenticate(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/timeline', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('main h1:visible').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(250)

  const sequence = [
    { path: '/timeline', width: 'app' },
    { path: '/diaries', width: 'app' },
    { path: '/stocks', width: 'wide' },
    { path: '/calendar', width: 'app' },
    { path: '/tools/market-rotation', width: 'wide' },
  ] as const

  const navigateFromShell = async (path: string, width: 'app' | 'wide') => {
    const shell = page.locator('[data-navigation-shell]')
    const visibleTarget = shell.locator(`a[href="${path}"]:visible`).first()
    if (await visibleTarget.count()) {
      await visibleTarget.click()
    } else {
      const menuIndexByPath: Record<string, number> = {
        '/diaries': 0,
        '/stocks': 1,
        '/calendar': 0,
        '/tools/market-rotation': 2,
      }
      const menuButton = shell.locator('button[aria-haspopup="menu"]').nth(menuIndexByPath[path] ?? -1)
      await menuButton.click()
      const menuTarget = shell.locator(`a[href="${path}"]:visible`).first()
      await expect(menuTarget).toBeVisible({ timeout: 1_000 })
      await menuTarget.click()
    }

    await page.waitForURL(`**${path}`)
    await expect(page.locator('main h1:visible').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('main [data-page-container]')).toHaveAttribute('data-page-container-width', width)
  }

  const measurements: Array<{ width: string; left: number }> = []

  for (const [index, route] of sequence.entries()) {
    if (index > 0) await navigateFromShell(route.path, route.width)

    const metrics = await page.evaluate(() => {
      const container = document.querySelector<HTMLElement>('main [data-page-container]')
      const navigationContainer = document.querySelector<HTMLElement>('nav [data-page-container]')
      const root = document.documentElement

      return {
        containerWidth: container?.dataset.pageContainerWidth ?? null,
        left: container?.getBoundingClientRect().left ?? null,
        navigationLeft: navigationContainer?.getBoundingClientRect().left ?? null,
        rootScrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
      }
    })

    expect(metrics.containerWidth).toBe(route.width)
    if (route.width === 'app') {
      expect(Math.round(metrics.navigationLeft ?? 0)).toBe(Math.round(metrics.left ?? 0))
    }
    expect(metrics.rootScrollWidth).toBeLessThanOrEqual(metrics.clientWidth)
    measurements.push({ width: route.width, left: Math.round(metrics.left ?? 0) })
  }

  const appLeftEdges = measurements
    .filter(measurement => measurement.width === 'app')
    .map(measurement => measurement.left)
  expect([...new Set(appLeftEdges)]).toHaveLength(1)
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf-8')

describe('authenticated shell responsive regressions', () => {
  it('uses a bounded page-width contract that can shrink inside the viewport', () => {
    const source = read('components/layout/PageContainer.vue')

    expect(source).toContain('box-sizing: border-box')
    expect(source).toContain('min-width: 0')
    expect(source).toContain('max-width: min(100%, var(--page-container-max-width))')
  })

  it('does not force three Timeline KPIs into narrow mobile columns', () => {
    const source = read('pages/timeline/index.vue')

    expect(source).toContain('timeline-summary-grid')
    expect(source).toContain('grid-cols-1')
    expect(source).toContain('@media (min-width: 24rem)')
    expect(source).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
    expect(source).toContain('sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]')
    expect(source).not.toContain('class="grid grid-cols-3 gap-3 sm:grid-cols-[')
  })

  it('keeps dynamic Timeline content shrinkable at the row and metadata seams', () => {
    const source = read('pages/timeline/index.vue')

    expect(source).toMatch(/grid[^\"]*grid-cols-\[24px_minmax\(0,1fr\)\]/)
    expect(source).toContain('timeline-meta-item min-w-0')
    expect(source).toContain('overflow-wrap: anywhere')
  })

  it('declares the iOS viewport contract and safe-area-aware mobile shell surfaces', () => {
    const nuxtConfig = read('nuxt.config.ts')
    const bottomNavigation = read('components/BottomNavigation.vue')
    const mobileNavigation = read('components/nav/MobileNav.vue')

    expect(nuxtConfig).toContain('viewport-fit=cover')
    expect(bottomNavigation).toContain('safe-area-inset-left')
    expect(bottomNavigation).toContain('safe-area-inset-right')
    expect(mobileNavigation).toContain('safe-area-inset-top')
    expect(mobileNavigation).toContain('safe-area-inset-bottom')
  })

  it('does not use global overflow clipping as the active shell fix', () => {
    const activeShell = read('layouts/default.vue')
    const mobileCss = read('assets/css/mobile.css')

    expect(activeShell).not.toContain('overflow-x: hidden')
    expect(mobileCss).not.toContain('overflow-x: hidden')
  })
})

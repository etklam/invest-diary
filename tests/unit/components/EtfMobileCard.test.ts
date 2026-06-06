import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computed } from 'vue'
import { mount } from '@vue/test-utils'
import EtfMobileCard from '~/components/EtfMobileCard.vue'
import type { SectorTrendRow } from '~/lib/etf-sector-trend'

/**
 * Helper: builds a valid SectorTrendRow with sensible defaults.
 * Override specific fields per test case.
 */
function buildRow(overrides: Partial<SectorTrendRow> = {}): SectorTrendRow {
  return {
    symbol: 'XLK',
    sector: 'Technology',
    rsi: 58.42,
    last: 512.35,
    dailyChange: 1.23,
    weeklyChange: -0.45,
    ema10: 508.1,
    ema20: 502.7,
    sma50: 495.0,
    ema10Status: 'ABOVE',
    ema20Status: 'ABOVE',
    sma50Status: 'BELOW',
    ytdHighDistance: -3.2,
    latestDate: '2026-06-05T00:00:00.000Z',
    closeCount: 120,
    recentCloses: [500, 505, 510, 512],
    ...overrides,
  }
}

describe('EtfMobileCard', () => {
  beforeEach(() => {
    vi.stubGlobal('computed', computed)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders ticker symbol', () => {
    const row = buildRow({ symbol: 'XLF' })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('XLF')
  })

  it('renders sector name', () => {
    const row = buildRow({ sector: 'Financials' })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('Financials')
  })

  it('renders last price', () => {
    const row = buildRow({ last: 123.45 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('123.45')
  })

  it('renders daily change with positive color', () => {
    const row = buildRow({ dailyChange: 2.15 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('+2.15%')
    const changeEl = wrapper.find('[data-testid="daily-change"]')
    expect(changeEl.classes()).toContain('text-emerald-600')
  })

  it('renders daily change with negative color', () => {
    const row = buildRow({ dailyChange: -1.87 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('-1.87%')
    const changeEl = wrapper.find('[data-testid="daily-change"]')
    expect(changeEl.classes()).toContain('text-red-600')
  })

  it('renders RSI value', () => {
    const row = buildRow({ rsi: 62.8 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('62.8')
  })

  it('renders MA status indicators with correct colors', () => {
    const row = buildRow({ ema10Status: 'ABOVE', ema20Status: 'BELOW' })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    const ema10El = wrapper.find('[data-testid="ma-ema10"]')
    expect(ema10El.classes()).toContain('text-emerald-500')

    const ema20El = wrapper.find('[data-testid="ma-ema20"]')
    expect(ema20El.classes()).toContain('text-red-500')
  })

  it('handles null values gracefully showing --', () => {
    const row = buildRow({
      last: null,
      dailyChange: null,
      rsi: null,
      ema10Status: null,
      ema20Status: null,
    })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    // last price should show '--'
    const priceEl = wrapper.find('[data-testid="last-price"]')
    expect(priceEl.text()).toBe('--')

    // daily change should show '--'
    const changeEl = wrapper.find('[data-testid="daily-change"]')
    expect(changeEl.text()).toBe('--')

    // RSI should show '--'
    const rsiEl = wrapper.find('[data-testid="rsi-value"]')
    expect(rsiEl.text()).toBe('--')

    // MA indicators should use muted color when null
    const ema10El = wrapper.find('[data-testid="ma-ema10"]')
    expect(ema10El.classes()).toContain('text-dt-text-muted')
  })

  it('emits click event when card is clicked', async () => {
    const row = buildRow()
    const wrapper = mount(EtfMobileCard, { props: { row } })

    await wrapper.find('article').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

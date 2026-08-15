import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EtfMobileCard from '~/components/EtfMobileCard.vue'
import type { MarketRotationMonitorRow } from '~/lib/market-rotation/monitor'

/**
 * Helper: builds a valid MarketRotationMonitorRow with sensible defaults.
 * Override specific fields per test case.
 */
function buildRow(overrides: Partial<MarketRotationMonitorRow> = {}): MarketRotationMonitorRow {
  return {
    symbol: 'XLK',
    name: 'Technology Select Sector SPDR',
    groupType: 'sector',
    sectorName: 'Technology',
    lastPrice: 512.35,
    rsi14: 58.42,
    above20d: true,
    above50d: false,
    maStatus: 'healthy_pullback',
    percentFromHigh: -3.2,
    rotationScore: 72.5,
    rotationScoreDelta2W: 5.3,
    rotationRank: 3,
    rankDelta2W: 2,
    rsiDelta2W: 4.5,
    twoWeekPerformancePct: 3.2,
    twoWeekTrend: [],
    signal: 'turning_strong',
    signalStatus: 'complete',
    ...overrides,
  }
}

describe('EtfMobileCard', () => {
  it('renders ticker symbol', () => {
    const row = buildRow({ symbol: 'XLF' })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('XLF')
  })

  it('renders sector name', () => {
    const row = buildRow({ sectorName: 'Financials' })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('Financials')
  })

  it('renders last price', () => {
    const row = buildRow({ lastPrice: 123.45 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.find('[data-testid="last-price"]').text()).toContain('123.45')
  })

  it('renders rotation rank', () => {
    const row = buildRow({ rotationRank: 1 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('#1')
  })

  it('renders rotation rank as -- when null', () => {
    const row = buildRow({ rotationRank: null })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('marketRotation.common.notAvailable')
  })

  it('renders RSI value', () => {
    const row = buildRow({ rsi14: 62.8 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.find('[data-testid="rsi-value"]').text()).toContain('62.8')
  })

  it('renders RSI delta with positive color', () => {
    const row = buildRow({ rsiDelta2W: 5.3 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    const el = wrapper.find('[data-testid="rsi-delta"]')
    expect(el.text()).toContain('+5.3 pts')
    expect(el.classes()).toContain('text-dt-success')
  })

  it('renders RSI delta with negative color', () => {
    const row = buildRow({ rsiDelta2W: -3.1 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    const el = wrapper.find('[data-testid="rsi-delta"]')
    expect(el.text()).toContain('-3.1 pts')
    expect(el.classes()).toContain('text-dt-danger')
  })

  it('renders 2W performance with negative color', () => {
    const row = buildRow({ twoWeekPerformancePct: -2.1 })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    const el = wrapper.find('[data-testid="2w-perf"]')
    expect(el.text()).toContain('-2.10%')
    expect(el.classes()).toContain('text-dt-danger')
  })

  it('renders signal badge text', () => {
    const row = buildRow({ signal: 'turning_strong' })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('marketRotation.signals.turning_strong')
  })

  it('renders MA status badge text', () => {
    const row = buildRow({ maStatus: 'bullish_stack' })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('marketRotation.maStatuses.bullish_stack')
  })

  it('renders above50d indicator', () => {
    const row = buildRow({ above50d: true })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('marketRotation.filters.above_50d')
  })

  it('renders below50d indicator', () => {
    const row = buildRow({ above50d: false })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.text()).toContain('marketRotation.filters.below_50d')
  })

  it('handles null values gracefully showing --', () => {
    const row = buildRow({
      lastPrice: null,
      rsi14: null,
      rsiDelta2W: null,
      twoWeekPerformancePct: null,
      percentFromHigh: null,
    })
    const wrapper = mount(EtfMobileCard, { props: { row } })

    expect(wrapper.find('[data-testid="last-price"]').text()).toBe('marketRotation.common.notAvailable')
    expect(wrapper.find('[data-testid="rsi-value"]').text()).toBe('marketRotation.common.notAvailable')
    expect(wrapper.find('[data-testid="rsi-delta"]').text()).toBe('marketRotation.common.notAvailable')
    expect(wrapper.find('[data-testid="2w-perf"]').text()).toBe('marketRotation.common.notAvailable')
    expect(wrapper.find('[data-testid="pct-high"]').text()).toBe('marketRotation.common.notAvailable')
  })

  it('emits click event when card is clicked', async () => {
    const row = buildRow()
    const wrapper = mount(EtfMobileCard, { props: { row } })

    await wrapper.find('article').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

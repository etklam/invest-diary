import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HoldingsDisplay from '~/components/HoldingsDisplay.vue'

describe('HoldingsDisplay', () => {
  beforeEach(() => {
    vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
  })

  it('renders a self-contained local holding', () => {
    const wrapper = mount(HoldingsDisplay, {
      props: {
        transactions: [{
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 2,
          price: 100,
          tradeDate: '2026-08-01T10:00:00.000Z',
        }],
      },
    })

    expect(wrapper.text()).toContain('AAPL')
    expect(wrapper.text()).not.toContain('diary.decisionRecord.holdingsUnavailable')
  })

  it('does not crash when a valid Diary sell depends on earlier ledger history', () => {
    const wrapper = mount(HoldingsDisplay, {
      props: {
        transactions: [{
          symbol: 'AAPL',
          type: 'SELL',
          quantity: 1,
          price: 120,
          tradeDate: '2026-08-02T10:00:00.000Z',
        }],
      },
    })

    expect(wrapper.get('[role="status"]').text()).toBe('diary.decisionRecord.holdingsUnavailable')
    expect(wrapper.find('table').exists()).toBe(false)
  })
})

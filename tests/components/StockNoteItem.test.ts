import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StockNoteItem from '~/components/stocks/StockNoteItem.vue'
import { toStockNoteView } from '~/lib/stocks/note-view'
import type { StockNoteResponse } from '~/types/stock-note'

const baseResponse: StockNoteResponse = {
  id: 'note-1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  title: 'Quarterly thesis',
  content: 'Earnings remain strong.',
  date: '2026-05-18T00:00:00.000Z',
  createdVia: 'USER',
  createdByLabel: null,
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
}

const mountItem = (response: StockNoteResponse) => mount(StockNoteItem, {
  props: { note: toStockNoteView(response) },
  global: {
    stubs: {
      Icon: {
        template: '<span data-testid="icon" :data-name="name" />',
        props: ['name', 'class'],
      },
    },
  },
})

describe('StockNoteItem', () => {
  it('renders a human partner note with a user icon and no edit controls', () => {
    const wrapper = mountItem({
      ...baseResponse,
      createdByLabel: 'Ana',
      isOwnedByViewer: false,
    })

    expect(wrapper.find('[data-testid="stock-note-author-icon"]').attributes('data-name')).toBe('heroicons:user')
    expect(wrapper.text()).toContain('Ana')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('renders an agent note with a CPU icon and keeps it non-editable', () => {
    const wrapper = mountItem({
      ...baseResponse,
      createdVia: 'AGENT',
      createdByLabel: 'OpenClaw',
      isOwnedByViewer: true,
    })

    expect(wrapper.find('[data-testid="stock-note-author-icon"]').attributes('data-name')).toBe('heroicons:cpu-chip')
    expect(wrapper.text()).toContain('OpenClaw')
    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('renders edit controls only for a self-authored human note', () => {
    const wrapper = mountItem({
      ...baseResponse,
      isOwnedByViewer: true,
    })

    expect(wrapper.findAll('button')).toHaveLength(2)
    expect(wrapper.find('[data-testid="stock-note-author-icon"]').attributes('data-name')).toBe('heroicons:user')
  })
})

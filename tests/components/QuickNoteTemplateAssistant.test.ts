import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import QuickNoteTemplateAssistant from '~/components/quicknote/QuickNoteTemplateAssistant.vue'
const localeRef = ref('en')

const messages: Record<string, string> = {
  'quickDiary.templateAssistant.title': 'Template Assistant',
  'quickDiary.templateAssistant.description': 'Template fields update the suggested title and content.',
  'quickDiary.templateAssistant.applyChanges': 'Apply template changes',
  'quickDiary.templateAssistant.regenerate': 'Regenerate template content',
  'quickDiary.reflection.marketCondition': 'Market condition',
  'quickDiary.reflection.selectCondition': 'Select...',
  'quickDiary.reflection.rating': "Today's rating",
  'quickDiary.reflection.goodPoints': 'What went well',
  'quickDiary.reflection.noRashTrading': 'No rash trading',
  'quickDiary.reflection.improvePoints': 'Areas for improvement',
  'quickDiary.reflection.goodPointsPlaceholder': 'What did you do well today?',
  'quickDiary.reflection.improvePointsPlaceholder': 'What can be improved?',
  'quickDiary.reflection.relatedTrades': 'Related trades (optional)',
  'quickDiary.reflection.relatedTradesSelected': '{count} selected',
  'quickDiary.reflection.loadingTrades': 'Loading recent trades...',
  'quickDiary.reflection.noRecentTrades': 'No closed trades in the last 30 days',
  'quickDiary.reflection.spx.button': 'Estimate with SPX',
  'quickDiary.reflection.spx.loading': 'Loading SPX...',
  'quickDiary.reflection.spx.applied': 'SPX {change}; suggested condition applied: {condition}. You can still change it.',
  'quickDiary.reflection.spx.error': 'SPX session could not be loaded. Pick the condition manually.',
  'quickDiary.observation.type': 'Observation type',
}

function mountAssistant(props: Record<string, unknown>) {
  vi.stubGlobal('useI18n', () => ({
    locale: localeRef,
    t: (key: string, params?: Record<string, unknown>) => {
      const template = messages[key] || key
      return template.replace(/\{(\w+)\}/g, (_, name) => params?.[name] ?? `{${name}}`)
    },
  }))

  return mount(QuickNoteTemplateAssistant, {
    props: {
      templateKind: 'reflection',
      templateData: {},
      hasTemplateChangesPending: false,
      ...props,
    },
  })
}

describe('QuickNoteTemplateAssistant', () => {
  beforeEach(() => {
    localeRef.value = 'en'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders locale-aware reflection copy and emits semantic market condition values', async () => {
    const wrapper = mountAssistant({
      templateKind: 'reflection',
      templateData: { marketCondition: '大漲' },
      hasTemplateChangesPending: true,
    })

    expect(wrapper.text()).toContain('Template Assistant')
    expect(wrapper.text()).toContain('Apply template changes')
    expect(wrapper.get('select').element.value).toBe('strongUp')
    expect(wrapper.html()).toContain('Price Change')
    expect(wrapper.html()).toContain('Strong rally')

    await wrapper.get('select').setValue('gapUpAndGo')

    expect(wrapper.emitted('update:templateData')).toEqual([
      [{ marketCondition: 'gapUpAndGo' }],
    ])
  })

  it('renders locale-aware observation labels and emits semantic observation type values', async () => {
    const wrapper = mountAssistant({
      templateKind: 'observation',
      templateData: { observationType: '板塊熱點' },
    })

    expect(wrapper.text()).toContain('Observation type')
    expect(wrapper.text()).toContain('Sector momentum')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('update:templateData')).toEqual([
      [{ observationType: 'sectorMomentum' }],
    ])
  })

  it('reflection template shows empty trades state when no recent trades', () => {
    const wrapper = mountAssistant({
      templateKind: 'reflection',
      templateData: {},
    })

    expect(wrapper.text()).toContain('Related trades (optional)')
    expect(wrapper.text()).toContain('No closed trades in the last 30 days')
  })

  it('reflection template shows trade list and toggles selection', async () => {
    const mockTrade = {
      id: '1',
      symbol: 'AAPL',
      sellDate: '2024-06-01T00:00:00.000Z',
      sellQuantity: 10,
      realizedPnL: 200,
      realizedPnLPct: 20,
    }

    vi.stubGlobal('useFetch', vi.fn(() => ({
      data: ref({ trades: [mockTrade] }),
      pending: ref(false),
      error: ref(null),
      execute: vi.fn(),
    })))

    const wrapper = mountAssistant({
      templateKind: 'reflection',
      templateData: { relatedTrades: [] },
    })

    // 確認交易行顯示
    expect(wrapper.text()).toContain('AAPL')
    expect(wrapper.text()).toContain('×10')

    // 勾選 checkbox
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(true)

    const emitted = wrapper.emitted('update:templateData') as any[][]
    expect(emitted).toBeTruthy()
    expect(emitted[emitted.length - 1][0]).toMatchObject({
      relatedTrades: [expect.objectContaining({ id: '1', symbol: 'AAPL' })],
    })
  })

  it('reflection template shows badge when trades are selected', () => {
    const mockTrade = {
      id: '1',
      symbol: 'AAPL',
      sellDate: '2024-06-01T00:00:00.000Z',
      sellQuantity: 10,
      realizedPnL: 200,
      realizedPnLPct: 20,
    }

    vi.stubGlobal('useFetch', vi.fn(() => ({
      data: ref({ trades: [mockTrade] }),
      pending: ref(false),
      error: ref(null),
      execute: vi.fn(),
    })))

    const wrapper = mountAssistant({
      templateKind: 'reflection',
      templateData: { relatedTrades: [mockTrade] },
    })

    // 有選中時應顯示 count badge
    expect(wrapper.text()).toContain('1 selected')
  })

  it('applies SPX market condition suggestions while keeping the selector editable', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      condition: 'slightUp',
      changePercent: 0.42,
    })
    vi.stubGlobal('$fetch', fetchMock)

    const wrapper = mountAssistant({
      templateKind: 'reflection',
      templateData: {},
    })

    await wrapper.findAll('button').find(button => button.text().includes('Estimate with SPX'))!.trigger('click')
    await flushPromises()

    expect(fetchMock).toHaveBeenCalledWith('/api/market/spx-session')
    expect(wrapper.emitted('update:templateData')).toContainEqual([
      { marketCondition: 'slightUp' },
    ])
    expect(wrapper.text()).toContain('SPX +0.42%')
    expect(wrapper.text()).toContain('Modest rise')
  })
})

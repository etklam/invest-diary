import { describe, it, expect } from 'vitest'
import { generateTemplateDraft } from '~/lib/quicknote/generate-template-draft'

describe('generateTemplateDraft', () => {
  it('returns a neutral diary title for blank quicknotes', () => {
    const result = generateTemplateDraft({
      templateKind: 'blank',
      date: '2026-03-22',
      locale: 'en',
      templateData: {},
    })

    expect(result).toEqual({
      title: '2026/03/22 Diary',
      content: '',
    })
  })

  it('builds trading titles and content from structured fields', () => {
    const result = generateTemplateDraft({
      templateKind: 'trading',
      date: '2026-03-22',
      locale: 'en',
      templateData: {
        tradingType: 'buy',
        symbols: 'TSLA, NVDA',
        marketMood: 'bullish',
        note: 'Waited for confirmation before entry.',
      },
    })

    expect(result.title).toBe('2026/03/22 Buy Diary - TSLA, NVDA')
    expect(result.content).toContain('## Today\'s Operation')
    expect(result.content).toContain('TSLA, NVDA')
    expect(result.content).toContain('Waited for confirmation before entry.')
  })

  it('uses the observation topic as the title when available', () => {
    const result = generateTemplateDraft({
      templateKind: 'observation',
      date: '2026-03-22',
      locale: 'zh-TW',
      templateData: {
        topic: '半導體資金輪動',
        observationType: '板塊熱點',
        observationContent: '尾盤資金明顯回流。',
      },
    })

    expect(result.title).toBe('半導體資金輪動')
    expect(result.content).toContain('板塊熱點')
    expect(result.content).toContain('尾盤資金明顯回流。')
  })
})

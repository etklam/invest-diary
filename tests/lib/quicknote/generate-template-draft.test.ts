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

  it('localizes structured reflection and observation values from semantic keys', () => {
    const reflection = generateTemplateDraft({
      templateKind: 'reflection',
      date: '2026-03-22',
      locale: 'en',
      templateData: {
        marketCondition: 'gapUpAndGo',
        rating: 4,
      },
    })

    const observation = generateTemplateDraft({
      templateKind: 'observation',
      date: '2026-03-22',
      locale: 'en',
      templateData: {
        observationType: 'sectorMomentum',
        observationContent: 'Breadth improved into the close.',
      },
    })

    expect(reflection.content).toContain('Gap up and go')
    expect(observation.content).toContain('Sector momentum')
  })

  it('translates legacy localized template values when the locale changes', () => {
    const reflection = generateTemplateDraft({
      templateKind: 'reflection',
      date: '2026-03-22',
      locale: 'en',
      templateData: {
        marketCondition: '大漲',
      },
    })

    const observation = generateTemplateDraft({
      templateKind: 'observation',
      date: '2026-03-22',
      locale: 'en',
      templateData: {
        observationType: '板塊熱點',
      },
    })

    expect(reflection.content).toContain('Strong rally')
    expect(observation.content).toContain('Sector momentum')
  })
})

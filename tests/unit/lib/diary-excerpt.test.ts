import { describe, expect, it } from 'vitest'
import { stripDiaryMarkdown } from '~/lib/diary-excerpt'

describe('stripDiaryMarkdown', () => {
  it('removes markdown markers and collapses whitespace', () => {
    expect(stripDiaryMarkdown('# Bought **AAPL**\n> held - patiently')).toBe('Bought AAPL held patiently')
  })

  it('returns an empty string for empty content', () => {
    expect(stripDiaryMarkdown(null)).toBe('')
  })
})

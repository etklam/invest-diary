import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('strategy performance page contract', () => {
  it('renders deterministic strategy and emotion performance from stats API', () => {
    const content = readFileSync(resolve(process.cwd(), 'pages/strategy-performance/index.vue'), 'utf8')

    expect(content).toContain("middleware: 'auth'")
    expect(content).toContain('/api/stats/performance')
    expect(content).toContain('strategyBreakdown')
    expect(content).toContain('emotionBreakdown')
    expect(content).toContain('bestStrategy')
    expect(content).toContain('worstStrategy')
    expect(content).not.toMatch(/openai|claude|gemini|llm|auto-summary/i)
  })

  it('keeps performance breakdown table focused on P/L and win rate', () => {
    const content = readFileSync(resolve(process.cwd(), 'components/PerformanceBreakdownTable.vue'), 'utf8')

    expect(content).toContain('realizedPnL')
    expect(content).toContain('winRate')
    expect(content).toContain('tradeCount')
  })
})
